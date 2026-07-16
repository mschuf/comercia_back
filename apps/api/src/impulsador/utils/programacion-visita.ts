import type {
  ProgramacionVisitaCalculo,
  ProgramacionVisitaDto,
} from '../interfaces/programacion-visita.interface';

interface PartesFecha {
  anio: number;
  mes: number;
  dia: number;
}

interface PartesFechaHora extends PartesFecha {
  hora: number;
  minuto: number;
  segundo: number;
}

const MAX_DIAS_BUSQUEDA = 366 * 10;

function partesEnZona(fecha: Date, zonaHoraria: string): PartesFechaHora {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);
  return {
    anio: valor('year'),
    mes: valor('month'),
    dia: valor('day'),
    hora: valor('hour'),
    minuto: valor('minute'),
    segundo: valor('second'),
  };
}

function fechaLocalAUtc(
  partes: PartesFecha,
  hora: number,
  minuto: number,
  zonaHoraria: string,
): Date {
  const objetivoUtc = Date.UTC(
    partes.anio,
    partes.mes - 1,
    partes.dia,
    hora,
    minuto,
  );
  let estimada = objetivoUtc;

  // Dos pasadas resuelven también cambios de offset por horario de verano.
  for (let intento = 0; intento < 2; intento += 1) {
    const zonificada = partesEnZona(new Date(estimada), zonaHoraria);
    const representadaComoUtc = Date.UTC(
      zonificada.anio,
      zonificada.mes - 1,
      zonificada.dia,
      zonificada.hora,
      zonificada.minuto,
      zonificada.segundo,
    );
    estimada += objetivoUtc - representadaComoUtc;
  }

  return new Date(estimada);
}

function fechaSolo(fecha: Date): PartesFecha {
  return {
    anio: fecha.getUTCFullYear(),
    mes: fecha.getUTCMonth() + 1,
    dia: fecha.getUTCDate(),
  };
}

function fechaSoloAValor(partes: PartesFecha): number {
  return Date.UTC(partes.anio, partes.mes - 1, partes.dia);
}

function compararFecha(a: PartesFecha, b: PartesFecha): number {
  return fechaSoloAValor(a) - fechaSoloAValor(b);
}

function sumarDias(partes: PartesFecha, dias: number): PartesFecha {
  const fecha = new Date(fechaSoloAValor(partes) + dias * 86_400_000);
  return fechaSolo(fecha);
}

function diaIso(partes: PartesFecha): number {
  const dia = new Date(fechaSoloAValor(partes)).getUTCDay();
  return dia === 0 ? 7 : dia;
}

function coincideFrecuencia(
  programacion: ProgramacionVisitaCalculo,
  fecha: PartesFecha,
  inicio: PartesFecha,
): boolean {
  if (programacion.frecuencia === 'UNICA') {
    return compararFecha(fecha, inicio) === 0;
  }

  if (programacion.frecuencia === 'SEMANAL') {
    const diasDesdeInicio = Math.floor(
      (fechaSoloAValor(fecha) - fechaSoloAValor(inicio)) / 86_400_000,
    );
    const semana = Math.floor(diasDesdeInicio / 7);
    return (
      semana % programacion.intervalo === 0 &&
      programacion.diasSemana.includes(diaIso(fecha))
    );
  }

  const mesesDesdeInicio =
    (fecha.anio - inicio.anio) * 12 + fecha.mes - inicio.mes;
  return (
    mesesDesdeInicio % programacion.intervalo === 0 &&
    programacion.diasMes.includes(fecha.dia)
  );
}

export function validarZonaHoraria(zonaHoraria: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zonaHoraria }).format();
    return true;
  } catch {
    return false;
  }
}

export function proximaOcurrenciaVisita(
  programacion: ProgramacionVisitaCalculo,
  despuesDe: Date,
): Date | null {
  if (!programacion.activo || programacion.horarios.length === 0) return null;

  const inicio = fechaSolo(programacion.fechaInicio);
  const fin = programacion.fechaFin ? fechaSolo(programacion.fechaFin) : null;
  const referenciaZona = partesEnZona(despuesDe, programacion.zonaHoraria);
  const referenciaFecha: PartesFecha = referenciaZona;
  let fecha =
    compararFecha(referenciaFecha, inicio) < 0 ? inicio : referenciaFecha;

  for (let indice = 0; indice < MAX_DIAS_BUSQUEDA; indice += 1) {
    if (fin && compararFecha(fecha, fin) > 0) return null;
    if (
      compararFecha(fecha, inicio) >= 0 &&
      coincideFrecuencia(programacion, fecha, inicio)
    ) {
      for (const horario of programacion.horarios) {
        const [hora, minuto] = horario.split(':').map(Number);
        const candidata = fechaLocalAUtc(
          fecha,
          hora,
          minuto,
          programacion.zonaHoraria,
        );
        if (candidata.getTime() > despuesDe.getTime()) return candidata;
      }
    }
    if (programacion.frecuencia === 'UNICA') return null;
    fecha = sumarDias(fecha, 1);
  }

  return null;
}

export function fechaSoloIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function aProgramacionVisitaDto(
  programacion: ProgramacionVisitaCalculo,
): ProgramacionVisitaDto {
  return {
    frecuencia: programacion.frecuencia,
    fechaInicio: fechaSoloIso(programacion.fechaInicio),
    fechaFin: programacion.fechaFin
      ? fechaSoloIso(programacion.fechaFin)
      : null,
    intervalo: programacion.intervalo,
    diasSemana: [...programacion.diasSemana],
    diasMes: [...programacion.diasMes],
    horarios: [...programacion.horarios],
    zonaHoraria: programacion.zonaHoraria,
    activo: programacion.activo,
  };
}
