import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { ConfigImpulsadorService } from './config-impulsador.service';
import { PAGINAS_IMPULSADOR } from './impulsador.constants';
import { poligonoParaGuardar } from './territorios.service';
import {
  ActualizarZonaDto,
  CrearZonaDto,
  ListarZonasDto,
} from './dto/zona.dto';
import type { ZonaDto } from './interfaces/zona.interface';

export const SELECT_ZONA = {
  id: true,
  territorioId: true,
  nombre: true,
  repositores: {
    select: {
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
  },
  color: true,
  poligono: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  territorio: { select: { nombre: true } },
  _count: { select: { locales: true } },
} as const;

type ZonaConRelaciones = {
  id: number;
  territorioId: number;
  nombre: string;
  repositores: {
    usuario: { id: number; nombre: string; apellido: string };
  }[];
  color: string;
  poligono: Prisma.JsonValue | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  territorio: { nombre: string };
  _count: { locales: number };
};

export function aZonaDto(z: ZonaConRelaciones): ZonaDto {
  return {
    id: z.id,
    territorioId: z.territorioId,
    territorioNombre: z.territorio.nombre,
    nombre: z.nombre,
    repositores: z.repositores.map(({ usuario }) => ({
      id: usuario.id,
      nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
    })),
    color: z.color,
    // El Json de Prisma llega opaco; la forma se garantizó al guardar
    poligono: (z.poligono as [number, number][] | null) ?? null,
    activo: z.activo,
    localesCount: z._count.locales,
    createdAt: z.createdAt.toISOString(),
    updatedAt: z.updatedAt.toISOString(),
  };
}

@Injectable()
export class ZonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configImpulsador: ConfigImpulsadorService,
  ) {}

  // Lectura para cualquier usuario con acceso al módulo (gestor u operativo)
  async listar(
    usuarioId: number,
    filtros: ListarZonasDto,
  ): Promise<RespuestaPaginada<ZonaDto>> {
    const usuario = await this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    const where = {
      empresaId: usuario.empresaId,
      ...(filtros.territorioId && { territorioId: filtros.territorioId }),
      ...(usuario.esGestor
        ? {}
        : { repositores: { some: { usuarioId: usuario.id } } }),
    };
    const { skip, take, page, limit } = rangoPaginacion(filtros);
    const [total, zonas] = await Promise.all([
      this.prisma.zona.count({ where }),
      this.prisma.zona.findMany({
        where,
        select: SELECT_ZONA,
        orderBy: [{ territorio: { nombre: 'asc' } }, { nombre: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(zonas.map(aZonaDto), total, page, limit);
  }

  // Zonas activas completas para selects. Excepción documentada a la paginación
  // estándar: el front las necesita todas juntas; el take fijo acota el peor
  // caso sin cambiar el uso real (decenas por empresa).
  async todas(usuarioId: number): Promise<ZonaDto[]> {
    const usuario = await this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    const zonas = await this.prisma.zona.findMany({
      where: {
        empresaId: usuario.empresaId,
        activo: true,
        ...(usuario.esGestor
          ? {}
          : { repositores: { some: { usuarioId: usuario.id } } }),
      },
      select: SELECT_ZONA,
      orderBy: [{ territorio: { nombre: 'asc' } }, { nombre: 'asc' }],
      take: 200,
    });
    return zonas.map(aZonaDto);
  }

  // Mensaje neutro: no revela si el territorio existe pero es de otra empresa
  private async territorioDeEmpresa(
    territorioId: number,
    empresaId: number,
  ): Promise<void> {
    const territorio = await this.prisma.territorio.findUnique({
      where: { id: territorioId },
      select: { empresaId: true },
    });
    if (!territorio || territorio.empresaId !== empresaId) {
      throw new NotFoundException('El territorio no existe');
    }
  }

  async crear(usuarioId: number, dto: CrearZonaDto): Promise<ZonaDto> {
    const usuario = await this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede crear zonas');
    }
    await this.territorioDeEmpresa(dto.territorioId, usuario.empresaId);
    const usuarioIds = await this.configImpulsador.validarRepositores(
      usuario.empresaId,
      dto.usuarioIds ?? [],
    );
    const zona = await this.prisma.zona.create({
      data: {
        // empresa y autor SIEMPRE del usuario actual, jamás del payload
        empresaId: usuario.empresaId,
        creadoPorId: usuario.id,
        territorioId: dto.territorioId,
        nombre: dto.nombre,
        color: dto.color ?? '#0284c7',
        poligono: poligonoParaGuardar(dto.poligono ?? null),
        repositores: {
          create: usuarioIds.map((repositorId) => ({
            usuarioId: repositorId,
            asignadoPorId: usuario.id,
          })),
        },
      },
      select: SELECT_ZONA,
    });
    return aZonaDto(zona);
  }

  // Mensaje neutro: no revela si la zona existe pero es de otra empresa
  private async zonaDeEmpresa(
    id: number,
    empresaId: number,
  ): Promise<{ id: number }> {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      select: { id: true, empresaId: true },
    });
    if (!zona || zona.empresaId !== empresaId) {
      throw new NotFoundException('La zona no existe');
    }
    return { id: zona.id };
  }

  async actualizar(
    usuarioId: number,
    id: number,
    dto: ActualizarZonaDto,
  ): Promise<ZonaDto> {
    const usuario = await this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar zonas');
    }
    await this.zonaDeEmpresa(id, usuario.empresaId);
    if (dto.territorioId !== undefined) {
      await this.territorioDeEmpresa(dto.territorioId, usuario.empresaId);
    }
    const usuarioIds =
      dto.usuarioIds === undefined
        ? undefined
        : await this.configImpulsador.validarRepositores(
            usuario.empresaId,
            dto.usuarioIds,
          );
    if (usuarioIds !== undefined) {
      const localesFuera = await this.prisma.local.count({
        where: {
          zonaId: id,
          usuarioId: { notIn: usuarioIds },
        },
      });
      if (localesFuera > 0) {
        throw new BadRequestException(
          'No se puede quitar un repositor que todavía tiene locales en la zona',
        );
      }
    }
    const zona = await this.prisma.zona.update({
      where: { id },
      data: {
        territorioId: dto.territorioId,
        nombre: dto.nombre,
        color: dto.color,
        activo: dto.activo,
        poligono: poligonoParaGuardar(dto.poligono),
        repositores:
          usuarioIds === undefined
            ? undefined
            : {
                deleteMany: {},
                create: usuarioIds.map((repositorId) => ({
                  usuarioId: repositorId,
                  asignadoPorId: usuario.id,
                })),
              },
      },
      select: SELECT_ZONA,
    });
    return aZonaDto(zona);
  }

  async eliminar(usuarioId: number, id: number): Promise<{ ok: true }> {
    const usuario = await this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede eliminar zonas');
    }
    await this.zonaDeEmpresa(id, usuario.empresaId);
    // Los locales quedan con zonaId null (onDelete: SetNull), no se pierden
    await this.prisma.zona.delete({ where: { id } });
    return { ok: true };
  }
}
