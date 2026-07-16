import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigImpulsadorService } from '../impulsador/config-impulsador.service';
import { PAGINAS_OPERACION_CAMPO } from '../impulsador/impulsador.constants';
import type { UsuarioImpulsador } from '../impulsador/interfaces/usuario-impulsador.interface';
import {
  respuestaPaginada,
  rangoPaginacion,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import {
  ActualizarLocalDto,
  CrearLocalDto,
  ListarLocalesDto,
} from './dto/local.dto';
import type {
  LocalDetalleDto,
  LocalDto,
  UsuarioAsignable,
} from './interfaces/local.interface';
import { aTareaLocalDto, SELECT_TAREA_LOCAL } from './tareas-local.service';

type LocalConRelaciones = {
  id: number;
  nombre: string;
  cliente: {
    id: number;
    nombre: string;
    descripcionTareas: string;
    imagenReferencia: string | null;
    _count: { tareas: number };
  };
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  radioMetros: number | null;
  fechaVisita: Date | null;
  requiereFotoPresencia: boolean;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  usuario: { id: number; nombre: string; apellido: string } | null;
  creadoPor: { id: number; nombre: string; apellido: string };
};

const SELECT_LOCAL = {
  id: true,
  nombre: true,
  cliente: {
    select: {
      id: true,
      nombre: true,
      descripcionTareas: true,
      imagenReferencia: true,
      _count: { select: { tareas: { where: { activo: true } } } },
    },
  },
  latitud: true,
  longitud: true,
  zona: { select: { id: true, nombre: true } },
  radioMetros: true,
  fechaVisita: true,
  requiereFotoPresencia: true,
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
    cliente: { id: local.cliente.id, nombre: local.cliente.nombre },
    latitud: local.latitud,
    longitud: local.longitud,
    zona: local.zona ? { id: local.zona.id, nombre: local.zona.nombre } : null,
    radioMetros: local.radioMetros,
    fechaVisita: local.fechaVisita?.toISOString() ?? null,
    requiereFotoPresencia: local.requiereFotoPresencia,
    tareasCount: local.cliente._count.tareas,
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
    private readonly configImpulsador: ConfigImpulsadorService,
  ) {}

  private usuarioActual(usuarioId: number): Promise<UsuarioImpulsador> {
    // El acceso por página y el permiso gestor/operativo salen de la config
    // de operaciones de campo. Alcanza con ver alguna de sus páginas.
    // porque las vistas de mapa y de visitas también listan locales.
    return this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_OPERACION_CAMPO,
    );
  }

  // Team Leader: todos los locales de su empresa. Repositor: solo los suyos.
  async listar(
    usuarioId: number,
    query: ListarLocalesDto,
  ): Promise<RespuestaPaginada<LocalDto>> {
    const actual = await this.usuarioActual(usuarioId);
    const where = {
      empresaId: actual.empresaId,
      clienteId: query.clienteId,
      ...(actual.esGestor
        ? { usuarioId: query.usuarioId }
        : { usuarioId: actual.id, activo: true }),
    };

    const { skip, take, page, limit } = rangoPaginacion(query);
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
    const config = await this.configImpulsador.deEmpresa(actual.empresaId);
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        empresaId: actual.empresaId,
        isActive: true,
        // Si la empresa configuró roles operativos, el select solo ofrece
        // usuarios de esos roles; lista vacía = cualquier usuario activo
        ...(config.rolOperativoIds.length > 0
          ? { rolId: { in: config.rolOperativoIds } }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        nombreLogin: true,
        rol: { select: { descripcion: true } },
      },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 200,
    });
    return usuarios.map((u) => ({
      id: u.id,
      nombre: `${u.nombre} ${u.apellido}`.trim(),
      nombreLogin: u.nombreLogin,
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

  private async clienteDeEmpresa(id: number, empresaId: number): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: { empresaId: true, activo: true },
    });
    if (!cliente || cliente.empresaId !== empresaId || !cliente.activo) {
      throw new NotFoundException('El cliente no existe');
    }
  }

  // La zona debe existir y ser de la empresa del gestor (mensaje neutro)
  private async zonaDeEmpresa(id: number, empresaId: number): Promise<void> {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      select: { empresaId: true },
    });
    if (!zona || zona.empresaId !== empresaId) {
      throw new NotFoundException('La zona no existe');
    }
  }

  private async validarRepositorDeZona(
    zonaId: number,
    usuarioId: number,
  ): Promise<void> {
    const asignacion = await this.prisma.zonaUsuario.findUnique({
      where: { zonaId_usuarioId: { zonaId, usuarioId } },
      select: { id: true },
    });
    if (!asignacion) {
      throw new ForbiddenException(
        'El repositor debe estar asignado a la zona del local',
      );
    }
  }

  async crear(usuarioId: number, dto: CrearLocalDto): Promise<LocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede crear locales');
    }
    await Promise.all([
      this.clienteDeEmpresa(dto.clienteId, actual.empresaId),
      this.validarAsignado(actual.empresaId, dto.usuarioId),
      this.zonaDeEmpresa(dto.zonaId, actual.empresaId),
    ]);
    await this.validarRepositorDeZona(dto.zonaId, dto.usuarioId);
    const local = await this.prisma.local.create({
      data: {
        empresaId: actual.empresaId,
        clienteId: dto.clienteId,
        nombre: dto.nombre,
        latitud: dto.latitud,
        longitud: dto.longitud,
        zonaId: dto.zonaId,
        radioMetros: dto.radioMetros ?? null,
        fechaVisita: dto.fechaVisita ? new Date(dto.fechaVisita) : null,
        requiereFotoPresencia: dto.requiereFotoPresencia ?? false,
        usuarioId: dto.usuarioId,
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
  ): Promise<{
    id: number;
    clienteId: number;
    zonaId: number | null;
    usuarioId: number | null;
  }> {
    const local = await this.prisma.local.findUnique({
      where: { id },
      select: {
        id: true,
        empresaId: true,
        clienteId: true,
        zonaId: true,
        usuarioId: true,
      },
    });
    if (!local || local.empresaId !== empresaId) {
      throw new NotFoundException('El local no existe');
    }
    return {
      id: local.id,
      clienteId: local.clienteId,
      zonaId: local.zonaId,
      usuarioId: local.usuarioId,
    };
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
    const existente = await this.localDeEmpresa(id, actual.empresaId);
    const clienteId = dto.clienteId ?? existente.clienteId;
    const zonaId = dto.zonaId === undefined ? existente.zonaId : dto.zonaId;
    const usuarioAsignadoId =
      dto.usuarioId === undefined ? existente.usuarioId : dto.usuarioId;
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    if (dto.usuarioId != null) {
      await this.validarAsignado(actual.empresaId, dto.usuarioId);
    }
    if (dto.zonaId != null) {
      await this.zonaDeEmpresa(dto.zonaId, actual.empresaId);
    }
    if (zonaId === null || usuarioAsignadoId === null) {
      throw new ForbiddenException('El local debe tener zona y repositor');
    }
    await this.validarRepositorDeZona(zonaId, usuarioAsignadoId);
    const local = await this.prisma.local.update({
      where: { id },
      data: {
        clienteId: dto.clienteId,
        nombre: dto.nombre,
        latitud: dto.latitud,
        longitud: dto.longitud,
        // undefined = no tocar; null = quitar de la zona
        zonaId: dto.zonaId,
        // undefined = no tocar; null = volver al default de la config
        radioMetros: dto.radioMetros,
        // undefined = no tocar; null = sin visita programada
        fechaVisita:
          dto.fechaVisita === undefined
            ? undefined
            : dto.fechaVisita
              ? new Date(dto.fechaVisita)
              : null,
        requiereFotoPresencia: dto.requiereFotoPresencia,
        // undefined = no tocar; null = desasignar
        usuarioId: dto.usuarioId,
        activo: dto.activo,
      },
      select: SELECT_LOCAL,
    });
    return aLocalDto(local);
  }

  // Detalle con checklist: gestor ve cualquier local de su empresa (tareas
  // incluidas las inactivas); el operativo solo su local asignado y activas.
  async detalle(usuarioId: number, id: number): Promise<LocalDetalleDto> {
    const actual = await this.usuarioActual(usuarioId);
    const local = await this.prisma.local.findUnique({
      where: { id },
      select: {
        ...SELECT_LOCAL,
        empresaId: true,
        usuarioId: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            descripcionTareas: true,
            imagenReferencia: true,
            _count: { select: { tareas: { where: { activo: true } } } },
            tareas: {
              where: actual.esGestor ? {} : { activo: true },
              select: SELECT_TAREA_LOCAL,
              orderBy: [{ orden: 'asc' }, { id: 'asc' }],
            },
          },
        },
      },
    });
    // Mensaje neutro: no revela si el local existe pero es ajeno
    if (!local || local.empresaId !== actual.empresaId) {
      throw new NotFoundException('El local no existe');
    }
    if (!actual.esGestor && local.usuarioId !== actual.id) {
      throw new NotFoundException('El local no existe');
    }
    return {
      ...aLocalDto(local),
      tareas: local.cliente.tareas.map(aTareaLocalDto),
      descripcionTareas: local.cliente.descripcionTareas,
      imagenReferencia: local.cliente.imagenReferencia,
      radioMetrosEfectivo: local.radioMetros ?? actual.radioMetrosDefecto,
    };
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
