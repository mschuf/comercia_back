import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigImpulsadorService } from './config-impulsador.service';
import { PAGINA_LOCALES, PAGINA_MAPA } from './impulsador.constants';
import { aTerritorioDto, SELECT_TERRITORIO } from './territorios.service';
import { aZonaDto, SELECT_ZONA } from './zonas.service';
import type { LocalMapaDto, MapaDatosDto } from './interfaces/mapa.interface';

const SELECT_LOCAL_MAPA = {
  id: true,
  nombre: true,
  latitud: true,
  longitud: true,
  zonaId: true,
  radioMetros: true,
  fechaVisita: true,
  requiereFotoPresencia: true,
  activo: true,
  usuario: { select: { nombre: true, apellido: true } },
  // Solo las tareas vigentes cuentan para el badge del pin
  _count: { select: { tareas: { where: { activo: true } } } },
} as const;

type LocalParaMapa = {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  zonaId: number | null;
  radioMetros: number | null;
  fechaVisita: Date | null;
  requiereFotoPresencia: boolean;
  activo: boolean;
  usuario: { nombre: string; apellido: string } | null;
  _count: { tareas: number };
};

function aLocalMapaDto(l: LocalParaMapa): LocalMapaDto {
  return {
    id: l.id,
    nombre: l.nombre,
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
    tareasCount: l._count.tareas,
  };
}

@Injectable()
export class MapaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configImpulsador: ConfigImpulsadorService,
  ) {}

  // Todo lo que la vista de mapa necesita en una sola llamada. Sirve también a
  // la vista de locales, por eso alcanza con acceso a alguna de las dos páginas.
  async datos(usuarioId: number): Promise<MapaDatosDto> {
    const usuario = await this.configImpulsador.usuarioImpulsador(usuarioId, [
      PAGINA_MAPA,
      PAGINA_LOCALES,
    ]);

    // Gestor: todos los locales de su empresa; operativo: solo los suyos
    const whereLocales = usuario.esGestor
      ? { empresaId: usuario.empresaId, activo: true }
      : { empresaId: usuario.empresaId, usuarioId: usuario.id, activo: true };

    const [territorios, zonas, locales] = await Promise.all([
      this.prisma.territorio.findMany({
        where: { empresaId: usuario.empresaId, activo: true },
        select: SELECT_TERRITORIO,
        orderBy: { nombre: 'asc' },
        // Excepción documentada a la paginación: el mapa dibuja todas las
        // capas juntas; el take fijo acota el peor caso por empresa.
        take: 500,
      }),
      this.prisma.zona.findMany({
        where: { empresaId: usuario.empresaId, activo: true },
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

    return {
      territorios: territorios.map(aTerritorioDto),
      zonas: zonas.map(aZonaDto),
      locales: locales.map(aLocalMapaDto),
      esGestor: usuario.esGestor,
    };
  }
}
