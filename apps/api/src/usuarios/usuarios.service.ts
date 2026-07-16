import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { hashPassword } from '../auth/utils/password';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarUsuarioDto,
  CrearUsuarioDto,
  ListarUsuariosDto,
} from './dto/usuario.dto';
import type {
  MetaUsuariosDto,
  UsuarioAdminDto,
} from './interfaces/usuario-admin.interface';
import { esRolAdminUsuarios } from './utils/rol-admin-usuarios';

const SELECT_USUARIO_ADMIN = {
  id: true,
  nombre: true,
  apellido: true,
  correo: true,
  nombreLogin: true,
  ruc: true,
  celular: true,
  isActive: true,
  createdAt: true,
  empresa: { select: { id: true, nombre: true } },
  rol: { select: { id: true, descripcion: true } },
  superior: { select: { id: true, nombre: true, apellido: true } },
} as const;

type UsuarioFila = {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  nombreLogin: string;
  ruc: string;
  celular: string;
  isActive: boolean;
  createdAt: Date;
  empresa: { id: number; nombre: string };
  rol: { id: number; descripcion: string } | null;
  superior: { id: number; nombre: string; apellido: string } | null;
};

interface ContextoAdmin {
  id: number;
  empresaId: number;
  esSuperadmin: boolean;
}

function aUsuarioDto(usuario: UsuarioFila): UsuarioAdminDto {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    correo: usuario.correo,
    nombreLogin: usuario.nombreLogin,
    ruc: usuario.ruc,
    celular: usuario.celular,
    empresa: usuario.empresa,
    rol: usuario.rol,
    superior: usuario.superior
      ? {
          id: usuario.superior.id,
          nombre:
            `${usuario.superior.nombre} ${usuario.superior.apellido}`.trim(),
        }
      : null,
    isActive: usuario.isActive,
    createdAt: usuario.createdAt.toISOString(),
  };
}

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async contexto(usuarioId: number): Promise<ContextoAdmin> {
    const actual = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        empresaId: true,
        esSuperadmin: true,
        isActive: true,
        rol: { select: { descripcion: true } },
      },
    });
    if (!actual || !actual.isActive) throw new UnauthorizedException();
    if (!actual.esSuperadmin) {
      const permitido = esRolAdminUsuarios(actual.rol?.descripcion ?? null);
      if (!permitido) {
        throw new ForbiddenException(
          'No tenés permiso para administrar usuarios',
        );
      }
    }
    return {
      id: actual.id,
      empresaId: actual.empresaId,
      esSuperadmin: actual.esSuperadmin,
    };
  }

  private empresaObjetivo(actual: ContextoAdmin, empresaId?: number): number {
    if (actual.esSuperadmin) return empresaId ?? actual.empresaId;
    if (empresaId !== undefined && empresaId !== actual.empresaId) {
      throw new ForbiddenException('No podés administrar otra empresa');
    }
    return actual.empresaId;
  }

  async listar(
    usuarioId: number,
    query: ListarUsuariosDto,
  ): Promise<RespuestaPaginada<UsuarioAdminDto>> {
    const actual = await this.contexto(usuarioId);
    const empresaId = this.empresaObjetivo(actual, query.empresaId);
    const where = { empresaId, esSuperadmin: false };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, usuarios] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        select: SELECT_USUARIO_ADMIN,
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(usuarios.map(aUsuarioDto), total, page, limit);
  }

  async meta(usuarioId: number): Promise<MetaUsuariosDto> {
    const actual = await this.contexto(usuarioId);
    const [empresas, roles] = await Promise.all([
      this.prisma.empresa.findMany({
        where: actual.esSuperadmin ? {} : { id: actual.empresaId },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
        take: 200,
      }),
      this.prisma.rol.findMany({
        select: { id: true, descripcion: true },
        orderBy: { descripcion: 'asc' },
        take: 100,
      }),
    ]);
    return { empresas, roles, esSuperadmin: actual.esSuperadmin };
  }

  private async validarAsignaciones(
    empresaId: number,
    rolId: number,
    superiorId?: number | null,
    usuarioEditadoId?: number,
  ): Promise<void> {
    const [rol, superior] = await Promise.all([
      this.prisma.rol.findUnique({
        where: { id: rolId },
        select: { id: true },
      }),
      superiorId
        ? this.prisma.usuario.findUnique({
            where: { id: superiorId },
            select: { id: true, empresaId: true, isActive: true },
          })
        : null,
    ]);
    if (!rol) throw new NotFoundException('El rol no existe');
    if (
      superiorId &&
      (!superior ||
        !superior.isActive ||
        superior.empresaId !== empresaId ||
        superior.id === usuarioEditadoId)
    ) {
      throw new NotFoundException('El superior no existe');
    }
  }

  async crear(
    usuarioId: number,
    dto: CrearUsuarioDto,
  ): Promise<UsuarioAdminDto> {
    const actual = await this.contexto(usuarioId);
    const empresaId = this.empresaObjetivo(actual, dto.empresaId);
    await this.validarAsignaciones(empresaId, dto.rolId, dto.superiorId);
    const creado = await this.auth.crearUsuario(
      { ...dto, empresaId },
      { rolId: dto.rolId, superiorId: dto.superiorId },
    );
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: creado.id },
      select: SELECT_USUARIO_ADMIN,
    });
    if (!usuario) throw new NotFoundException('El usuario no existe');
    return aUsuarioDto(usuario);
  }

  async actualizar(
    usuarioId: number,
    id: number,
    dto: ActualizarUsuarioDto,
  ): Promise<UsuarioAdminDto> {
    const actual = await this.contexto(usuarioId);
    const objetivo = await this.prisma.usuario.findUnique({
      where: { id },
      select: { empresaId: true, rolId: true, esSuperadmin: true },
    });
    if (
      !objetivo ||
      objetivo.esSuperadmin ||
      (!actual.esSuperadmin && objetivo.empresaId !== actual.empresaId)
    ) {
      throw new NotFoundException('El usuario no existe');
    }
    const rolId = dto.rolId ?? objetivo.rolId;
    if (rolId === null) throw new BadRequestException('El rol es obligatorio');
    await this.validarAsignaciones(
      objetivo.empresaId,
      rolId,
      dto.superiorId,
      id,
    );
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: {
        rolId: dto.rolId,
        superiorId: dto.superiorId,
        isActive: dto.isActive,
        passwordHash: dto.password
          ? await hashPassword(dto.password)
          : undefined,
      },
      select: SELECT_USUARIO_ADMIN,
    });
    return aUsuarioDto(usuario);
  }
}
