import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import { MAX_TAREAS_POR_LOCAL, PAGINA_MAPA } from './impulsador.constants';
import { aTerritorioDto, SELECT_TERRITORIO } from './territorios.service';
import { aZonaDto, SELECT_ZONA } from './zonas.service';
import type { LocalMapaDto, MapaDatosDto } from './interfaces/mapa.interface';
import { filtroTareaVisiblePara } from '../tareas/utils/visibilidad-tarea';

const SELECT_LOCAL_MAPA = {
  id: true,
  nombre: true,
  cliente: {
    select: {
      id: true,
      nombre: true,
    },
  },
  latitud: true,
  longitud: true,
  zonaId: true,
  radioMetros: true,
  fechaVisita: true,
  requiereFotoPresencia: true,
  activo: true,
  usuario: { select: { nombre: true, apellido: true } },
} as const;

type LocalParaMapa = {
  id: number;
  nombre: string;
  cliente: { id: number; nombre: string };
  latitud: number;
  longitud: number;
  zonaId: number | null;
  radioMetros: number | null;
  fechaVisita: Date | null;
  requiereFotoPresencia: boolean;
  activo: boolean;
  usuario: { nombre: string; apellido: string } | null;
};

function aLocalMapaDto(l: LocalParaMapa, tareasCount: number): LocalMapaDto {
  return {
    id: l.id,
    nombre: l.nombre,
    clienteNombre: l.cliente.nombre,
    latitud: l.latitud,
    longitud: l.longitud,
    zonaId: l.zonaId,
    radioMetros: l.radioMetros,
    fechaVisita: l.fechaVisita ? l.fechaVisita.toISOString() : null,
    requiereFotoPresencia: l.requiereFotoPresencia,
    asignadoA: l.usuario
      ? `${l.usuario.nombre} ${l.usuario.apellido}`.trim()
      : null,
    activo: l.activo,
    tareasCount,
  };
}

@Injectable()
export class MapaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  // Todo lo que la vista de mapa necesita en una sola llamada. Sirve también a
  // la vista de locales, por eso alcanza con acceso a alguna de las dos páginas.
  async datos(usuarioId: number): Promise<MapaDatosDto> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_MAPA]);

    // Gestor: todos los locales de su empresa; operativo: solo los suyos
    const whereLocales = usuario.esGestor
      ? { empresaId: usuario.empresaId, activo: true }
      : { empresaId: usuario.empresaId, usuarioId: usuario.id, activo: true };
    const whereTerritorios = usuario.esGestor
      ? { empresaId: usuario.empresaId, activo: true }
      : {
          empresaId: usuario.empresaId,
          activo: true,
          zonas: {
            some: { repositores: { some: { usuarioId: usuario.id } } },
          },
        };
    const whereZonas = usuario.esGestor
      ? { empresaId: usuario.empresaId, activo: true }
      : {
          empresaId: usuario.empresaId,
          activo: true,
          repositores: { some: { usuarioId: usuario.id } },
        };

    const [territorios, zonas, locales] = await Promise.all([
      this.prisma.territorio.findMany({
        where: whereTerritorios,
        select: SELECT_TERRITORIO,
        orderBy: { nombre: 'asc' },
        // Excepción documentada a la paginación: el mapa dibuja todas las
        // capas juntas; el take fijo acota el peor caso por empresa.
        take: 500,
      }),
      this.prisma.zona.findMany({
        where: whereZonas,
        select: SELECT_ZONA,
        orderBy: [{ territorio: { nombre: 'asc' } }, { nombre: 'asc' }],
        // Misma excepción que territorios: capas completas del mapa
        take: 500,
      }),
      this.prisma.local.findMany({
        where: whereLocales,
        select: SELECT_LOCAL_MAPA,
        orderBy: { nombre: 'asc' },
        // Excepción documentada: los pines se dibujan todos juntos; 2000 cubre
        // con holgura el peor caso real sin permitir respuestas sin cota.
        take: 2000,
      }),
    ]);

    const localIds = locales.map(({ id }) => id);
    const clienteIds = [...new Set(locales.map(({ cliente }) => cliente.id))];
    const tareas =
      locales.length === 0
        ? []
        : await this.prisma.tarea.findMany({
            where: {
              empresaId: usuario.empresaId,
              activo: true,
              AND: [
                ...(usuario.esGestor ? [] : [filtroTareaVisiblePara(usuario)]),
                {
                  OR: [
                    { alcanceLocales: 'TODOS' },
                    {
                      alcanceLocales: 'CLIENTE',
                      clienteId: { in: clienteIds },
                    },
                    {
                      alcanceLocales: 'SELECCIONADOS',
                      locales: { some: { localId: { in: localIds } } },
                    },
                  ],
                },
              ],
            },
            select: {
              alcanceLocales: true,
              clienteId: true,
              locales: {
                where: { localId: { in: localIds } },
                select: { localId: true },
                take: 2000,
              },
            },
            take: Math.min(5000, MAX_TAREAS_POR_LOCAL * locales.length),
          });
    const tareasPorLocal = new Map(localIds.map((id) => [id, 0]));
    for (const tarea of tareas) {
      for (const local of locales) {
        const aplica =
          tarea.alcanceLocales === 'TODOS' ||
          (tarea.alcanceLocales === 'CLIENTE' &&
            tarea.clienteId === local.cliente.id) ||
          tarea.locales.some(({ localId }) => localId === local.id);
        if (aplica) {
          tareasPorLocal.set(local.id, (tareasPorLocal.get(local.id) ?? 0) + 1);
        }
      }
    }

    return {
      territorios: territorios.map(aTerritorioDto),
      zonas: zonas.map(aZonaDto),
      locales: locales.map((local) =>
        aLocalMapaDto(local, tareasPorLocal.get(local.id) ?? 0),
      ),
      esGestor: usuario.esGestor,
    };
  }
}
