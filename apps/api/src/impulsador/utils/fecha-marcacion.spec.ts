import { BadRequestException } from '@nestjs/common';
import { fechaMarcacionDispositivo } from './fecha-marcacion';

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
});
