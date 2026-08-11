import { BadRequestException } from '@nestjs/common';

const FUTURO_MAXIMO_MS = 5 * 60_000;
const ANTIGUEDAD_MAXIMA_MS = 7 * 24 * 60 * 60_000;

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
