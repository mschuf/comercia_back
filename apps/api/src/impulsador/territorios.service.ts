import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PaginacionDto,
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import { PAGINA_MAPA } from './impulsador.constants';
import {
  ActualizarTerritorioDto,
  CrearTerritorioDto,
} from './dto/territorio.dto';
import type { TerritorioDto } from './interfaces/territorio.interface';
import { esPoligonoValido, type Poligono } from './utils/poligono';

export const SELECT_TERRITORIO = {
  id: true,
  nombre: true,
  responsable: { select: { id: true, nombre: true, apellido: true } },
  color: true,
  poligono: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { zonas: true } },
} as const;

type TerritorioConConteo = {
  id: number;
  nombre: string;
  responsable: { id: number; nombre: string; apellido: string } | null;
  color: string;
  poligono: Prisma.JsonValue | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { zonas: number };
};

export function aTerritorioDto(t: TerritorioConConteo): TerritorioDto {
  return {
    id: t.id,
    nombre: t.nombre,
    responsable: t.responsable
      ? {
          id: t.responsable.id,
          nombre: `${t.responsable.nombre} ${t.responsable.apellido}`.trim(),
        }
      : null,
    color: t.color,
    // El Json de Prisma llega opaco; la forma se garantizó al guardar
    poligono: (t.poligono as [number, number][] | null) ?? null,
    activo: t.activo,
    zonasCount: t._count.zonas,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

// Tri-estado del polígono en escrituras (compartido con zonas): undefined = no
// tocar; null = limpiar la columna Json (DbNull, no JSON null); array = validar
// la forma real de los vértices y guardar.
export function poligonoParaGuardar(
  valor: unknown[] | null | undefined,
): Poligono | typeof Prisma.DbNull | undefined {
  if (valor === undefined) {
    return undefined;
  }
  if (valor === null) {
    return Prisma.DbNull;
  }
  if (!esPoligonoValido(valor)) {
    throw new BadRequestException(
      'El polígono no es válido (mínimo 3 vértices [lat, lng])',
    );
  }
  return valor;
}

@Injectable()
export class TerritoriosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  // Lectura para cualquier usuario con acceso al módulo (gestor u operativo)
  async listar(
    usuarioId: number,
    paginacion: PaginacionDto,
  ): Promise<RespuestaPaginada<TerritorioDto>> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);
    const where = usuario.esGestor
      ? { empresaId: usuario.empresaId }
      : {
          empresaId: usuario.empresaId,
          zonas: {
            some: { repositores: { some: { usuarioId: usuario.id } } },
          },
        };
    const { skip, take, page, limit } = rangoPaginacion(paginacion);
    const [total, territorios] = await Promise.all([
      this.prisma.territorio.count({ where }),
      this.prisma.territorio.findMany({
        where,
        select: SELECT_TERRITORIO,
        orderBy: { nombre: 'asc' },
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      territorios.map(aTerritorioDto),
      total,
      page,
      limit,
    );
  }

  // Territorios activos completos para selects y el mapa. Excepción documentada
  // a la paginación estándar: el front los necesita todos juntos; el take fijo
  // acota el peor caso sin cambiar el uso real (decenas por empresa).
  async todos(usuarioId: number): Promise<TerritorioDto[]> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);
    const territorios = await this.prisma.territorio.findMany({
      where: usuario.esGestor
        ? { empresaId: usuario.empresaId, activo: true }
        : {
            empresaId: usuario.empresaId,
            activo: true,
            zonas: {
              some: { repositores: { some: { usuarioId: usuario.id } } },
            },
          },
      select: SELECT_TERRITORIO,
      orderBy: { nombre: 'asc' },
      take: 200,
    });
    return territorios.map(aTerritorioDto);
  }

  async crear(
    usuarioId: number,
    dto: CrearTerritorioDto,
  ): Promise<TerritorioDto> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede crear territorios');
    }
    if (dto.responsableId != null) {
      await this.accesoCampo.validarResponsableTerritorio(
        usuario.empresaId,
        dto.responsableId,
      );
    }
    const territorio = await this.prisma.territorio.create({
      data: {
        // empresa y autor SIEMPRE del usuario actual, jamás del payload
        empresaId: usuario.empresaId,
        creadoPorId: usuario.id,
        nombre: dto.nombre,
        responsableId: dto.responsableId ?? null,
        color: dto.color ?? '#047857',
        poligono: poligonoParaGuardar(dto.poligono ?? null),
      },
      select: SELECT_TERRITORIO,
    });
    return aTerritorioDto(territorio);
  }

  // Mensaje neutro: no revela si el territorio existe pero es de otra empresa
  private async territorioDeEmpresa(
    id: number,
    empresaId: number,
  ): Promise<{ id: number }> {
    const territorio = await this.prisma.territorio.findUnique({
      where: { id },
      select: { id: true, empresaId: true },
    });
    if (!territorio || territorio.empresaId !== empresaId) {
      throw new NotFoundException('El territorio no existe');
    }
    return { id: territorio.id };
  }

  async actualizar(
    usuarioId: number,
    id: number,
    dto: ActualizarTerritorioDto,
  ): Promise<TerritorioDto> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar territorios');
    }
    await this.territorioDeEmpresa(id, usuario.empresaId);
    if (dto.responsableId != null) {
      await this.accesoCampo.validarResponsableTerritorio(
        usuario.empresaId,
        dto.responsableId,
      );
    }
    const territorio = await this.prisma.territorio.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        responsableId: dto.responsableId,
        color: dto.color,
        activo: dto.activo,
        poligono: poligonoParaGuardar(dto.poligono),
      },
      select: SELECT_TERRITORIO,
    });
    return aTerritorioDto(territorio);
  }

  async eliminar(usuarioId: number, id: number): Promise<{ ok: true }> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede eliminar territorios');
    }
    await this.territorioDeEmpresa(id, usuario.empresaId);
    // Las zonas caen en cascada (onDelete: Cascade); el front avisa antes
    await this.prisma.territorio.delete({ where: { id } });
    return { ok: true };
  }
}
