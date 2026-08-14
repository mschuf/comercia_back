import { BadRequestException } from '@nestjs/common';
import {
  esJornadaDeDiaAnterior,
  fechaMarcacionDispositivo,
} from './fecha-marcacion';

describe('fechaMarcacionDispositivo', () => {
  const ahora = new Date('2026-08-11T15:00:00.000Z');

  it('conserva la hora real capturada por un telefono sin conexion', () => {
    const capturada = '2026-08-10T13:25:30.000Z';
    expect(fechaMarcacionDispositivo(capturada, ahora).toISOString()).toBe(
      capturada,
    );
  });

  it('usa la hora del servidor para clientes anteriores sin registradaEn', () => {
    expect(fechaMarcacionDispositivo(undefined, ahora)).toBe(ahora);
  });

  it('rechaza fechas futuras incompatibles con la jornada', () => {
    expect(() =>
      fechaMarcacionDispositivo('2026-08-11T15:06:00.000Z', ahora),
    ).toThrow(BadRequestException);
  });

  it('reconoce una jornada que quedo abierta en un dia anterior', () => {
    expect(
      esJornadaDeDiaAnterior(
        new Date('2026-08-10T15:00:00.000Z'),
        new Date('2026-08-11T15:00:00.000Z'),
      ),
    ).toBe(true);
    expect(
      esJornadaDeDiaAnterior(
        new Date('2026-08-11T03:00:00.000Z'),
        new Date('2026-08-11T15:00:00.000Z'),
      ),
    ).toBe(false);
  });
});
