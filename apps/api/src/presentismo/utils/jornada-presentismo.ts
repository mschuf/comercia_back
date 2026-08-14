import {
  fechaEnZonaIso,
  ocurrenciasVisitaEnDia,
} from '../../impulsador/utils/programacion-visita';
import type {
  EstadoJornadaPresentismo,
  JornadaPresentismoDto,
  LocalJornadaPresentismo,
  VisitaJornadaPresentismo,
} from '../interfaces/presentismo.interface';

function estadoJornada(
  programadaEn: Date | null,
  visita: VisitaJornadaPresentismo | null,
  ahora: Date,
): EstadoJornadaPresentismo {
  if (visita?.completadaEn) return 'COMPLETADA';
  if (visita) return 'EN_CURSO';
  if (!programadaEn) return 'NO_PROGRAMADA';
  return programadaEn.getTime() > ahora.getTime() ? 'PENDIENTE' : 'ATRASADA';
}

function aDetalle(
  local: JornadaPresentismoDto['local'],
  programadaEn: Date | null,
  visita: VisitaJornadaPresentismo | null,
  ahora: Date,
): JornadaPresentismoDto {
  return {
    id: programadaEn
      ? `programada:${local.id}:${programadaEn.toISOString()}`
      : `visita:${visita?.id ?? local.id}`,
    local,
    programadaEn: programadaEn?.toISOString() ?? null,
    entradaEn: visita?.iniciadaEn.toISOString() ?? null,
    salidaEn: visita?.completadaEn?.toISOString() ?? null,
    estado: estadoJornada(programadaEn, visita, ahora),
  };
}

function programadasDelLocal(
  local: LocalJornadaPresentismo,
  fecha: string,
): Date[] {
  if (local.programacionVisita) {
    return ocurrenciasVisitaEnDia(
      local.programacionVisita,
      new Date(`${fecha}T12:00:00.000Z`),
    );
  }
  if (
    local.fechaVisita &&
    fechaEnZonaIso(local.fechaVisita, 'America/Asuncion') === fecha
  ) {
    return [local.fechaVisita];
  }
  return [];
}

export function construirJornadaPresentismo(
  locales: LocalJornadaPresentismo[],
  visitas: VisitaJornadaPresentismo[],
  fecha: string,
  ahora: Date,
): JornadaPresentismoDto[] {
  const visitasPorLocal = new Map<number, VisitaJornadaPresentismo[]>();
  for (const visita of visitas) {
    const delLocal = visitasPorLocal.get(visita.localId) ?? [];
    delLocal.push(visita);
    visitasPorLocal.set(visita.localId, delLocal);
  }

  const detalles: JornadaPresentismoDto[] = [];
  for (const local of locales) {
    const localDto = {
      id: local.id,
      nombre: local.nombre,
      clienteNombre: local.cliente.nombre,
    };
    const visitasDelLocal = visitasPorLocal.get(local.id) ?? [];
    const programadas = programadasDelLocal(local, fecha).sort(
      (a, b) => a.getTime() - b.getTime(),
    );
    for (const programadaEn of programadas) {
      detalles.push(
        aDetalle(localDto, programadaEn, visitasDelLocal.shift() ?? null, ahora),
      );
    }
    for (const visita of visitasDelLocal) {
      detalles.push(aDetalle(localDto, null, visita, ahora));
    }
    visitasPorLocal.delete(local.id);
  }

  for (const visitasSinLocalAsignado of visitasPorLocal.values()) {
    for (const visita of visitasSinLocalAsignado) {
      detalles.push(
        aDetalle(
          {
            id: visita.local.id,
            nombre: visita.local.nombre,
            clienteNombre: visita.local.cliente.nombre,
          },
          null,
          visita,
          ahora,
        ),
      );
    }
  }

  return detalles.sort((a, b) => {
    const momentoA = a.programadaEn ?? a.entradaEn ?? '';
    const momentoB = b.programadaEn ?? b.entradaEn ?? '';
    return momentoA.localeCompare(momentoB) || a.local.nombre.localeCompare(b.local.nombre);
  });
}
