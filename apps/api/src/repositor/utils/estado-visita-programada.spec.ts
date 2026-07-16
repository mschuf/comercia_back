import { estadoVisitaProgramada } from './estado-visita-programada';

describe('estadoVisitaProgramada', () => {
  const ahora = new Date('2026-07-16T14:00:00.000Z');

  it('prioriza una visita que ya está en curso', () => {
    expect(estadoVisitaProgramada(new Date(), 15, ahora)).toBe('EN_CURSO');
  });

  it('distingue visitas atrasadas y pendientes', () => {
    expect(
      estadoVisitaProgramada(new Date('2026-07-16T13:00:00.000Z'), null, ahora),
    ).toBe('ATRASADA');
    expect(
      estadoVisitaProgramada(new Date('2026-07-16T15:00:00.000Z'), null, ahora),
    ).toBe('PENDIENTE');
  });
});
