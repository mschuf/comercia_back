import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import { esRolGestor, esRolOperativo } from '../common/utils/roles-impulsador';
import {
  MODULOS_OPERACION_CAMPO,
  PAGINAS_OPERACION_CAMPO,
} from './impulsador.constants';
import { ActualizarConfigImpulsadorDto } from './dto/config-impulsador.dto';
import type {
  ConfigImpulsadorAdminDto,
  ConfigImpulsadorDto,
  UsuarioAsignableImpulsadorDto,
} from './interfaces/config-impulsador.interface';
import type { ConfigEmpresa } from './interfaces/config-empresa.interface';
import type { UsuarioImpulsador } from './interfaces/usuario-impulsador.interface';

// Debe coincidir con el default de la columna radio_metros_defecto del schema
const RADIO_METROS_DEFECTO = 200;

@Injectable()
export class ConfigImpulsadorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: AccesoPlataformaService,
  ) {}

  // Config de la empresa; sin fila guardada aplican los defaults del módulo
  async deEmpresa(empresaId: number): Promise<ConfigEmpresa> {
    const config = await this.prisma.configImpulsador.findUnique({
      where: { empresaId },
      select: {
        rolGestorIds: true,
        rolOperativoIds: true,
        rolAdminUsuarioIds: true,
        radioMetrosDefecto: true,
      },
    });
    return (
      config ?? {
        rolGestorIds: [],
        rolOperativoIds: [],
        rolAdminUsuarioIds: [],
        radioMetrosDefecto: RADIO_METROS_DEFECTO,
      }
    );
  }

  // Cortafuegos común del módulo: valida el acceso por plataforma (empresa +
  // rol, autenticado ≠ autorizado) y resuelve los permisos efectivos del
  // usuario según la config de su empresa. Todos los services del módulo
  // arrancan por acá.
  async usuarioImpulsador(
    usuarioId: number,
    paginasRutas: string[],
  ): Promise<UsuarioImpulsador> {
    await this.acceso.exigirAccesoAlgunaPaginaEnModulos(
      usuarioId,
      MODULOS_OPERACION_CAMPO,
      paginasRutas,
    );

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        empresaId: true,
        rolId: true,
        isActive: true,
        esSuperadmin: true,
        rol: { select: { descripcion: true } },
      },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }

    const config = await this.deEmpresa(usuario.empresaId);
    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      esGestor:
        usuario.esSuperadmin ||
        esRolGestor(
          usuario.rolId,
          usuario.rol?.descripcion ?? null,
          config.rolGestorIds,
        ),
      esOperativo: esRolOperativo(usuario.rolId, config.rolOperativoIds),
      radioMetrosDefecto: config.radioMetrosDefecto,
    };
  }

  // Config de campo de la empresa + permisos efectivos del usuario actual.
  async paraUsuario(usuarioId: number): Promise<ConfigImpulsadorDto> {
    const usuario = await this.usuarioImpulsador(
      usuarioId,
      PAGINAS_OPERACION_CAMPO,
    );
    const config = await this.deEmpresa(usuario.empresaId);
    return {
      rolGestorIds: config.rolGestorIds,
      rolOperativoIds: config.rolOperativoIds,
      rolAdminUsuarioIds: config.rolAdminUsuarioIds,
      radioMetrosDefecto: config.radioMetrosDefecto,
      esGestor: usuario.esGestor,
      esOperativo: usuario.esOperativo,
    };
  }

  async validarResponsableTerritorio(
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    const [usuario, config] = await Promise.all([
      this.prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: {
          empresaId: true,
          rolId: true,
          isActive: true,
          rol: { select: { descripcion: true } },
        },
      }),
      this.deEmpresa(empresaId),
    ]);
    if (
      !usuario ||
      !usuario.isActive ||
      usuario.empresaId !== empresaId ||
      !esRolGestor(
        usuario.rolId,
        usuario.rol?.descripcion ?? null,
        config.rolGestorIds,
      )
    ) {
      throw new NotFoundException('El responsable no existe');
    }
  }

  async validarRepositores(
    empresaId: number,
    usuarioIds: number[],
  ): Promise<number[]> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0) return ids;
    const [usuarios, config] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { id: { in: ids }, empresaId, isActive: true },
        select: { id: true, rolId: true },
        take: 200,
      }),
      this.deEmpresa(empresaId),
    ]);
    if (
      usuarios.length !== ids.length ||
      usuarios.some((u) => !esRolOperativo(u.rolId, config.rolOperativoIds))
    ) {
      throw new BadRequestException(
        'Algún repositor no existe o no tiene un rol operativo',
      );
    }
    return ids;
  }

  async responsablesTerritorio(
    usuarioId: number,
  ): Promise<UsuarioAsignableImpulsadorDto[]> {
    const actual = await this.usuarioImpulsador(
      usuarioId,
      PAGINAS_OPERACION_CAMPO,
    );
    if (!actual.esGestor) return [];
    const config = await this.deEmpresa(actual.empresaId);
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        empresaId: actual.empresaId,
        isActive: true,
        ...(config.rolGestorIds.length > 0
          ? { rolId: { in: config.rolGestorIds } }
          : {}),
      },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rolId: true,
        rol: { select: { descripcion: true } },
      },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 200,
    });
    return usuarios
      .filter((u) =>
        esRolGestor(u.rolId, u.rol?.descripcion ?? null, config.rolGestorIds),
      )
      .map((u) => ({
        id: u.id,
        nombre: `${u.nombre} ${u.apellido}`.trim(),
        rol: u.rol?.descripcion ?? null,
      }));
  }

  private async exigirEmpresa(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('La empresa no existe');
    }
  }

  // Vista del superadmin: config de cualquier empresa (defaults si no hay fila)
  async admin(empresaId: number): Promise<ConfigImpulsadorAdminDto> {
    await this.exigirEmpresa(empresaId);
    const config = await this.deEmpresa(empresaId);
    return { empresaId, ...config };
  }

  // PUT del superadmin: reemplaza la config completa de la empresa
  async actualizar(
    empresaId: number,
    dto: ActualizarConfigImpulsadorDto,
  ): Promise<ConfigImpulsadorAdminDto> {
    await this.exigirEmpresa(empresaId);

    const rolGestorIds = dto.rolGestorIds ?? [];
    const rolOperativoIds = dto.rolOperativoIds ?? [];
    const rolAdminUsuarioIds = dto.rolAdminUsuarioIds ?? [];
    const radioMetrosDefecto = dto.radioMetrosDefecto ?? RADIO_METROS_DEFECTO;

    // Los roles indicados deben existir (mismo patrón que asignaciones)
    const rolIdsTodos = [
      ...new Set([...rolGestorIds, ...rolOperativoIds, ...rolAdminUsuarioIds]),
    ];
    if (rolIdsTodos.length > 0) {
      const rolesValidos = await this.prisma.rol.count({
        where: { id: { in: rolIdsTodos } },
      });
      if (rolesValidos !== rolIdsTodos.length) {
        throw new BadRequestException('Algún rol indicado no existe');
      }
    }

    const config = await this.prisma.configImpulsador.upsert({
      where: { empresaId },
      create: {
        empresaId,
        rolGestorIds,
        rolOperativoIds,
        rolAdminUsuarioIds,
        radioMetrosDefecto,
      },
      update: {
        rolGestorIds,
        rolOperativoIds,
        rolAdminUsuarioIds,
        radioMetrosDefecto,
      },
      select: {
        empresaId: true,
        rolGestorIds: true,
        rolOperativoIds: true,
        rolAdminUsuarioIds: true,
        radioMetrosDefecto: true,
      },
    });
    return {
      empresaId: config.empresaId,
      rolGestorIds: config.rolGestorIds,
      rolOperativoIds: config.rolOperativoIds,
      rolAdminUsuarioIds: config.rolAdminUsuarioIds,
      radioMetrosDefecto: config.radioMetrosDefecto,
    };
  }
}
