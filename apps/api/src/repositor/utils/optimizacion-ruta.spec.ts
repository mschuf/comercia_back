import type { MatrizRuta } from '../interfaces/osrm.interface';
import {
  completarMatriz,
  matrizHaversine,
  optimizarParadas,
} from './optimizacion-ruta';

describe('optimizacion de ruta', () => {
  it('prioriza una parada cercana que está por vencer', () => {
    const ahora = new Date('2026-07-16T12:00:00.000Z');
    const matriz: MatrizRuta = {
      distancias: [
        [0, 500, 4_000],
        [500, 0, 3_500],
        [4_000, 3_500, 0],
      ],
      duraciones: [
        [0, 60, 600],
        [60, 0, 500],
        [600, 500, 0],
      ],
    };
    const resultado = optimizarParadas(
      [
        {
          clave: 'cercana',
          indiceMatriz: 1,
          programadaEn: new Date('2026-07-16T12:05:00.000Z'),
        },
        {
          clave: 'lejana',
          indiceMatriz: 2,
          programadaEn: new Date('2026-07-16T14:00:00.000Z'),
        },
      ],
      matriz,
      0,
      ahora,
    );

    expect(resultado.map(({ clave }) => clave)).toEqual(['cercana', 'lejana']);
    expect(resultado[0].llegadaEstimada.toISOString()).toBe(
      '2026-07-16T12:01:00.000Z',
    );
  });

  it('completa celdas nulas de OSRM con el respaldo Haversine', () => {
    const resultado = completarMatriz(
      {
        distancias: [
          [0, Number.NaN],
          [100, 0],
        ],
        duraciones: [
          [0, Number.NaN],
          [10, 0],
        ],
      },
      {
        distancias: [
          [0, 120],
          [120, 0],
        ],
        duraciones: [
          [0, 18],
          [18, 0],
        ],
      },
    );

    expect(resultado.distancias[0][1]).toBe(120);
    expect(resultado.duraciones[0][1]).toBe(18);
  });

  it('genera una matriz simétrica y acotada para el fallback', () => {
    const resultado = matrizHaversine([
      { latitud: -25.2867, longitud: -57.6472 },
      { latitud: -25.2901, longitud: -57.6412 },
    ]);

    expect(resultado.distancias[0][0]).toBe(0);
    expect(resultado.distancias[0][1]).toBe(resultado.distancias[1][0]);
    expect(resultado.duraciones[0][1]).toBeGreaterThan(0);
  });
});
