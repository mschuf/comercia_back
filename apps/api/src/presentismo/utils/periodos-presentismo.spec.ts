import { diasDelPeriodo, periodosPresentismo } from './periodos-presentismo';

describe('periodos de presentismo', () => {
  it('arma día, semana desde el lunes y mes hasta la fecha de corte', () => {
    expect(periodosPresentismo('2026-08-12')).toEqual({
      dia: { desde: '2026-08-12', hasta: '2026-08-12' },
      semana: { desde: '2026-08-10', hasta: '2026-08-12' },
      mes: { desde: '2026-08-01', hasta: '2026-08-12' },
    });
  });

  it('incluye ambos extremos del rango', () => {
    expect(diasDelPeriodo('2026-08-10', '2026-08-12')).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
  });

  it('rechaza rangos invertidos', () => {
    expect(() => diasDelPeriodo('2026-08-12', '2026-08-10')).toThrow(
      'RANGO_INVALIDO',
    );
  });
});
