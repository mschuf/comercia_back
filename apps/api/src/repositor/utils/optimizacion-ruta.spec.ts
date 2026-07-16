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

  it('parte desde la ubicación actual y visita primero los locales vencidos más cercanos', () => {
    const ahora = new Date('2026-07-16T17:33:00.000Z');
    const matriz: MatrizRuta = {
      distancias: [
        [0, 9_700, 5_400, 80, 1_800],
        [9_700, 0, 4_000, 9_600, 8_200],
        [5_400, 4_000, 0, 5_300, 3_800],
        [80, 9_600, 5_300, 0, 1_700],
        [1_800, 8_200, 3_800, 1_700, 0],
      ],
      duraciones: [
        [0, 720, 480, 30, 180],
        [720, 0, 480, 710, 620],
        [480, 480, 0, 470, 360],
        [30, 710, 470, 0, 170],
        [180, 620, 360, 170, 0],
      ],
    };
    const resultado = optimizarParadas(
      [
        {
          clave: 'juan-valdez',
          indiceMatriz: 1,
          programadaEn: new Date('2026-07-16T19:00:00.000Z'),
        },
        {
          clave: 'tienda-movil',
          indiceMatriz: 2,
          programadaEn: new Date('2026-07-16T21:00:00.000Z'),
        },
        {
          clave: 'biggie-paseo',
          indiceMatriz: 3,
          programadaEn: new Date('2026-07-16T15:13:00.000Z'),
        },
        {
          clave: 'sallustro-paseo',
          indiceMatriz: 4,
          programadaEn: new Date('2026-07-16T14:00:00.000Z'),
        },
      ],
      matriz,
      0,
      ahora,
    );

    expect(resultado.map(({ clave }) => clave)).toEqual([
      'biggie-paseo',
      'sallustro-paseo',
      'juan-valdez',
      'tienda-movil',
    ]);
    expect(resultado[0].distanciaDesdeAnteriorMetros).toBe(80);
    expect(resultado[0].viajeDesdeAnteriorSegundos).toBe(30);
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
