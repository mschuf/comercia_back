import { esPoligonoValido, MAX_VERTICES_POLIGONO } from './poligono';

describe('esPoligonoValido', () => {
  const triangulo = [
    [-25.28, -57.64],
    [-25.29, -57.65],
    [-25.3, -57.63],
  ];

  it('acepta un triángulo válido', () => {
    expect(esPoligonoValido(triangulo)).toBe(true);
  });

  it('rechaza menos de 3 vértices', () => {
    expect(esPoligonoValido(triangulo.slice(0, 2))).toBe(false);
  });

  it('rechaza más del máximo de vértices', () => {
    const gigante = Array.from({ length: MAX_VERTICES_POLIGONO + 1 }, () => [
      0, 0,
    ]);
    expect(esPoligonoValido(gigante)).toBe(false);
  });

  it('rechaza coordenadas fuera de rango o mal formadas', () => {
    expect(
      esPoligonoValido([
        [91, 0],
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(
      esPoligonoValido([
        [0, 181],
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(esPoligonoValido([[0], [0, 0], [1, 1]])).toBe(false);
    expect(
      esPoligonoValido([
        ['a', 0],
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(
      esPoligonoValido([
        [Number.NaN, 0],
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(esPoligonoValido('no-array')).toBe(false);
    expect(esPoligonoValido(null)).toBe(false);
  });
});
