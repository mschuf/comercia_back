import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import {
  PaginacionDto,
  respuestaPaginada,
  rangoPaginacion,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { ActualizarLocalDto, CrearLocalDto } from './dto/local.dto';
import type { LocalDto, UsuarioAsignable } from './interfaces/local.interface';

// Este módulo vive en la página "locales" del módulo "impulsador": el acceso a
// sus datos respeta la habilitación por empresa y la visibilidad por rol que
// configuró el superadmin (no basta con estar autenticado).
const MODULO_RUTA = 'impulsador';
const PAGINA_RUTA = 'locales';

// Roles que gestionan locales (ABM completo dentro de su empresa).
// El resto (ej. IMPULSADOR) solo ve los locales que tiene asignados.
const ROLES_GESTORES = ['GERENTE', 'JEFE', 'SUPERVISOR', 'TEAMLEADER'];

interface UsuarioLocales {
  id: number;
  empresaId: number;
  esGestor: boolean;
}

type LocalConRelaciones = {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  usuario: { id: number; nombre: string; apellido: string } | null;
  creadoPor: { id: number; nombre: string; apellido: string };
};

const SELECT_LOCAL = {
  id: true,
  nombre: true,
  latitud: true,
  longitud: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  usuario: { select: { id: true, nombre: true, apellido: true } },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
} as const;

function aLocalDto(local: LocalConRelaciones): LocalDto {
  return {
    id: local.id,
    nombre: local.nombre,
    latitud: local.latitud,
    longitud: local.longitud,
    activo: local.activo,
    asignadoA: local.usuario
      ? {
          id: local.usuario.id,
          nombre: `${local.usuario.nombre} ${local.usuario.apellido}`.trim(),
        }
      : null,
    creadoPor: {
      id: local.creadoPor.id,
      nombre: `${local.creadoPor.nombre} ${local.creadoPor.apellido}`.trim(),
    },
    createdAt: local.createdAt.toISOString(),
    updatedAt: local.updatedAt.toISOString(),
  };
}

@Injectable()
export class LocalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: AccesoPlataformaService,
  ) {}

  private async usuarioActual(usuarioId: number): Promise<UsuarioLocales> {
    // Cortafuegos: la empresa debe tener el módulo Impulsador habilitado y el
    // rol del usuario debe poder verlo. Un rol excluido por el superadmin no
    // entra por la API aunque sepa la URL (autenticado ≠ autorizado).
    await this.acceso.exigirAccesoPagina(usuarioId, MODULO_RUTA, PAGINA_RUTA);

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        empresaId: true,
        isActive: true,
        rol: { select: { descripcion: true } },
      },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }
    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      esGestor:
        usuario.rol !== null &&
        ROLES_GESTORES.includes(usuario.rol.descripcion.toUpperCase()),
    };
  }

  // Gestor: todos los locales de su empresa. Impulsador: solo los asignados a él.
  async listar(
    usuarioId: number,
    paginacion: PaginacionDto,
  ): Promise<RespuestaPaginada<LocalDto>> {
    const actual = await this.usuarioActual(usuarioId);
    const where = actual.esGestor
      ? { empresaId: actual.empresaId }
      : { empresaId: actual.empresaId, usuarioId: actual.id, activo: true };

    const { skip, take, page, limit } = rangoPaginacion(paginacion);
    const [total, locales] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        select: SELECT_LOCAL,
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(locales.map(aLocalDto), total, page, limit);
  }

  // Usuarios activos de la empresa del gestor, para el select "asignar a"
  async usuariosAsignables(usuarioId: number): Promise<UsuarioAsignable[]> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede asignar locales');
    }
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId: actual.empresaId, isActive: true },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: { select: { descripcion: true } },
      },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 200,
    });
    return usuarios.map((u) => ({
      id: u.id,
      nombre: `${u.nombre} ${u.apellido}`.trim(),
      rol: u.rol?.descripcion ?? null,
    }));
  }

  // El usuario asignado debe existir, estar activo y ser de la misma empresa
  private async validarAsignado(
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    const asignado = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { empresaId: true, isActive: true },
    });
    if (!asignado || !asignado.isActive || asignado.empresaId !== empresaId) {
      throw new NotFoundException('El usuario asignado no existe');
    }
  }

  async crear(usuarioId: number, dto: CrearLocalDto): Promise<LocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede crear locales');
    }
    if (dto.usuarioId != null) {
      await this.validarAsignado(actual.empresaId, dto.usuarioId);
    }
    const local = await this.prisma.local.create({
      data: {
        empresaId: actual.empresaId,
        nombre: dto.nombre,
        latitud: dto.latitud,
        longitud: dto.longitud,
        usuarioId: dto.usuarioId ?? null,
        creadoPorId: actual.id,
      },
      select: SELECT_LOCAL,
    });
    return aLocalDto(local);
  }

  // Busca el local verificando que pertenezca a la empresa del gestor
  private async localDeEmpresa(
    id: number,
    empresaId: number,
  ): Promise<{ id: number }> {
    const local = await this.prisma.local.findUnique({
      where: { id },
      select: { id: true, empresaId: true },
    });
    if (!local || local.empresaId !== empresaId) {
      throw new NotFoundException('El local no existe');
    }
    return { id: local.id };
  }

  async actualizar(
    usuarioId: number,
    id: number,
    dto: ActualizarLocalDto,
  ): Promise<LocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar locales');
    }
    await this.localDeEmpresa(id, actual.empresaId);
    if (dto.usuarioId != null) {
      await this.validarAsignado(actual.empresaId, dto.usuarioId);
    }
    const local = await this.prisma.local.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        latitud: dto.latitud,
        longitud: dto.longitud,
        // undefined = no tocar; null = desasignar
        usuarioId: dto.usuarioId === undefined ? undefined : dto.usuarioId,
        activo: dto.activo,
      },
      select: SELECT_LOCAL,
    });
    return aLocalDto(local);
  }

  async eliminar(usuarioId: number, id: number): Promise<{ ok: true }> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede eliminar locales');
    }
    await this.localDeEmpresa(id, actual.empresaId);
    await this.prisma.local.delete({ where: { id } });
    return { ok: true };
  }
}
