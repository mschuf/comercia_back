import type { ProgramacionVisitaCalculo } from '../interfaces/programacion-visita.interface';
import {
  ocurrenciasVisitaEnDia,
  proximaOcurrenciaVisita,
} from './programacion-visita';

function base(
  cambios: Partial<ProgramacionVisitaCalculo> = {},
): ProgramacionVisitaCalculo {
  return {
    frecuencia: 'UNICA',
    fechaInicio: new Date('2026-07-15T00:00:00.000Z'),
    fechaFin: null,
    intervalo: 1,
    diasSemana: [],
    diasMes: [],
    horarios: ['09:00', '15:00'],
    zonaHoraria: 'UTC',
    activo: true,
    ...cambios,
  };
}

describe('proximaOcurrenciaVisita', () => {
  it('admite varias visitas el mismo día', () => {
    const resultado = proximaOcurrenciaVisita(
      base(),
      new Date('2026-07-15T10:00:00.000Z'),
    );
    expect(resultado?.toISOString()).toBe('2026-07-15T15:00:00.000Z');
  });

  it('calcula días semanales seleccionados', () => {
    const resultado = proximaOcurrenciaVisita(
      base({
        frecuencia: 'SEMANAL',
        fechaInicio: new Date('2026-07-13T00:00:00.000Z'),
        diasSemana: [1, 3],
        horarios: ['09:00'],
      }),
      new Date('2026-07-15T10:00:00.000Z'),
    );
    expect(resultado?.toISOString()).toBe('2026-07-20T09:00:00.000Z');
  });

  it('respeta el intervalo mensual y los días elegidos', () => {
    const resultado = proximaOcurrenciaVisita(
      base({
        frecuencia: 'MENSUAL',
        fechaInicio: new Date('2026-07-01T00:00:00.000Z'),
        intervalo: 2,
        diasMes: [1, 15],
        horarios: ['09:00'],
      }),
      new Date('2026-07-15T10:00:00.000Z'),
    );
    expect(resultado?.toISOString()).toBe('2026-09-01T09:00:00.000Z');
  });

  it('no genera fechas después del final', () => {
    const resultado = proximaOcurrenciaVisita(
      base({
        frecuencia: 'SEMANAL',
        fechaFin: new Date('2026-07-15T00:00:00.000Z'),
        diasSemana: [3],
        horarios: ['09:00'],
      }),
      new Date('2026-07-15T10:00:00.000Z'),
    );
    expect(resultado).toBeNull();
  });
});

describe('ocurrenciasVisitaEnDia', () => {
  it('devuelve todos los horarios del día en la zona configurada', () => {
    const resultado = ocurrenciasVisitaEnDia(
      base({
        zonaHoraria: 'America/Asuncion',
        fechaInicio: new Date('2026-07-15T00:00:00.000Z'),
      }),
      new Date('2026-07-15T12:00:00.000Z'),
    );

    expect(resultado.map((fecha) => fecha.toISOString())).toEqual([
      '2026-07-15T12:00:00.000Z',
      '2026-07-15T18:00:00.000Z',
    ]);
  });

  it('no inventa una ocurrencia en un día fuera de la frecuencia', () => {
    const resultado = ocurrenciasVisitaEnDia(
      base({
        frecuencia: 'SEMANAL',
        fechaInicio: new Date('2026-07-13T00:00:00.000Z'),
        diasSemana: [1],
      }),
      new Date('2026-07-15T12:00:00.000Z'),
    );

    expect(resultado).toEqual([]);
  });
});
