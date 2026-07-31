import { createHash } from 'node:crypto';
import type { AgendaDiaria } from '../interfaces/agenda-diaria.interface';
import type { RutaDiariaDto } from '../interfaces/ruta-diaria.interface';
import { estadoVisitaProgramada } from './estado-visita-programada';

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

export function esRutaDiariaGuardada(valor: unknown): valor is RutaDiariaDto {
  if (!esRegistro(valor)) return false;
  return (
    typeof valor.fecha === 'string' &&
    typeof valor.generadaEn === 'string' &&
    (valor.fuente === 'OSRM' || valor.fuente === 'HAVERSINE') &&
    typeof valor.usaUbicacionActual === 'boolean' &&
    typeof valor.totalProgramadas === 'number' &&
    typeof valor.totalCompletadas === 'number' &&
    typeof valor.distanciaTotalMetros === 'number' &&
    typeof valor.duracionTrasladoSegundos === 'number' &&
    typeof valor.ahorroEstimadoMetros === 'number' &&
    Array.isArray(valor.geometria) &&
    Array.isArray(valor.paradas)
  );
}

export function firmaAgendaRuta(agenda: AgendaDiaria): string {
  const contenido = {
    fecha: agenda.fecha,
    totalProgramadas: agenda.totalProgramadas,
    totalCompletadas: agenda.totalCompletadas,
    candidatas: agenda.candidatas.map((candidata) => ({
      clave: candidata.clave,
      programadaEn: candidata.programadaEn.toISOString(),
      visitaAbiertaId: candidata.visitaAbiertaId,
      local: candidata.local,
    })),
  };
  return createHash('sha256').update(JSON.stringify(contenido)).digest('hex');
}

export function actualizarRutaGuardada(
  ruta: RutaDiariaDto,
  agenda: AgendaDiaria,
  ahora: Date,
): RutaDiariaDto {
  const candidatas = new Map(
    agenda.candidatas.map((candidata) => [candidata.clave, candidata]),
  );
  return {
    ...ruta,
    totalProgramadas: agenda.totalProgramadas,
    totalCompletadas: agenda.totalCompletadas,
    paradas: ruta.paradas.map((parada) => {
      const candidata = candidatas.get(parada.clave);
      if (!candidata) return parada;
      return {
        ...parada,
        local: {
          id: candidata.local.id,
          nombre: candidata.local.nombre,
          cliente: candidata.local.cliente,
          zona: candidata.local.zona,
          latitud: candidata.local.latitud,
          longitud: candidata.local.longitud,
        },
        tareasActivas: candidata.local.tareasActivas,
        estado: estadoVisitaProgramada(
          candidata.programadaEn,
          candidata.visitaAbiertaId,
          ahora,
        ),
        visitaAbiertaId: candidata.visitaAbiertaId,
      };
    }),
  };
}
