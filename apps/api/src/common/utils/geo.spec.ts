import { distanciaMetros } from './geo';

describe('distanciaMetros', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(distanciaMetros(-25.2867, -57.6472, -25.2867, -57.6472)).toBe(0);
  });

  it('un grado de latitud son ~111,2 km', () => {
    const d = distanciaMetros(0, 0, 1, 0);
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_400);
  });

  it('es simétrica', () => {
    const ida = distanciaMetros(-25.28, -57.64, -25.29, -57.65);
    const vuelta = distanciaMetros(-25.29, -57.65, -25.28, -57.64);
    expect(ida).toBeCloseTo(vuelta, 6);
  });

  it('mide bien distancias cortas (radio de control)', () => {
    // ~100 m hacia el norte: 100 / 111194.9 grados de latitud
    const d = distanciaMetros(
      -25.2867,
      -57.6472,
      -25.2867 + 100 / 111_194.9,
      -57.6472,
    );
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });
});
