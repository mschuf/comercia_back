import { duracionVisitaMinutos } from './duracion-visita';

describe('duracionVisitaMinutos', () => {
  it('calcula minutos entre inicio y finalización', () => {
    expect(
      duracionVisitaMinutos(
        new Date('2026-07-16T12:00:00.000Z'),
        new Date('2026-07-16T12:42:30.000Z'),
      ),
    ).toBe(42.5);
  });

  it('devuelve null mientras la visita sigue abierta', () => {
    expect(duracionVisitaMinutos(new Date(), null)).toBeNull();
  });
});
