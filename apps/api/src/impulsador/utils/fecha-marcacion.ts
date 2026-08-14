import { BadRequestException } from '@nestjs/common';

const FUTURO_MAXIMO_MS = 5 * 60_000;
const ANTIGUEDAD_MAXIMA_MS = 7 * 24 * 60 * 60_000;
const ZONA_HORARIA_MARCACIONES = 'America/Asuncion';

function fechaIsoEnZona(fecha: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_MARCACIONES,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor('year')}-${valor('month')}-${valor('day')}`;
}

export function fechaMarcacionDispositivo(
  registradaEn: string | undefined,
  ahora = new Date(),
): Date {
  if (!registradaEn) return ahora;
  const fecha = new Date(registradaEn);
  const diferencia = fecha.getTime() - ahora.getTime();
  if (
    Number.isNaN(fecha.getTime()) ||
    diferencia > FUTURO_MAXIMO_MS ||
    diferencia < -ANTIGUEDAD_MAXIMA_MS
  ) {
    throw new BadRequestException(
      'La fecha de la marcación no coincide con una jornada reciente',
    );
  }
  return fecha;
}

// Una jornada olvidada se puede cerrar desde la ubicacion actual el dia siguiente.
export function esJornadaDeDiaAnterior(
  iniciadaEn: Date,
  ahora = new Date(),
): boolean {
  return fechaIsoEnZona(iniciadaEn) < fechaIsoEnZona(ahora);
}
