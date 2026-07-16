import { distanciaMetros } from '../../common/utils/geo';
import type { CoordenadaRuta, MatrizRuta } from '../interfaces/osrm.interface';
import type {
  ParadaOptimizada,
  ParadaParaOptimizar,
} from '../interfaces/ruta-diaria.interface';

const VELOCIDAD_URBANA_METROS_SEGUNDO = 30_000 / 3_600;
const FACTOR_CALLE = 1.25;
const DURACION_VISITA_SEGUNDOS = 20 * 60;

export function matrizHaversine(coordenadas: CoordenadaRuta[]): MatrizRuta {
  const distancias = coordenadas.map((origen) =>
    coordenadas.map((destino) =>
      Math.round(
        distanciaMetros(
          origen.latitud,
          origen.longitud,
          destino.latitud,
          destino.longitud,
        ) * FACTOR_CALLE,
      ),
    ),
  );
  return {
    distancias,
    duraciones: distancias.map((fila) =>
      fila.map((distancia) =>
        Math.round(distancia / VELOCIDAD_URBANA_METROS_SEGUNDO),
      ),
    ),
  };
}

export function completarMatriz(
  principal: MatrizRuta,
  respaldo: MatrizRuta,
): MatrizRuta {
  return {
    distancias: principal.distancias.map((fila, i) =>
      fila.map((valor, j) =>
        Number.isFinite(valor) ? valor : respaldo.distancias[i][j],
      ),
    ),
    duraciones: principal.duraciones.map((fila, i) =>
      fila.map((valor, j) =>
        Number.isFinite(valor) ? valor : respaldo.duraciones[i][j],
      ),
    ),
  };
}

export function optimizarParadas(
  paradas: ParadaParaOptimizar[],
  matriz: MatrizRuta,
  indiceOrigen: number | null,
  ahora: Date,
): ParadaOptimizada[] {
  const pendientes = [...paradas];
  const resultado: ParadaOptimizada[] = [];
  let indiceActual = indiceOrigen;
  let reloj = ahora.getTime();

  while (pendientes.length > 0) {
    const elegida = pendientes.reduce(
      (mejor, candidata) => {
        const duracion =
          indiceActual === null
            ? 0
            : matriz.duraciones[indiceActual][candidata.indiceMatriz];
        const llegada = reloj + duracion * 1000;
        const demora = Math.max(0, llegada - candidata.programadaEn.getTime());
        const antelacion = Math.max(
          0,
          candidata.programadaEn.getTime() - llegada,
        );
        const puntaje =
          duracion + (demora / 1000) * 5 + (antelacion / 1000) * 0.04;
        if (mejor === null || puntaje < mejor.puntaje) {
          return { parada: candidata, puntaje, llegada, duracion };
        }
        return mejor;
      },
      null as null | {
        parada: ParadaParaOptimizar;
        puntaje: number;
        llegada: number;
        duracion: number;
      },
    );

    if (elegida === null) break;
    const distancia =
      indiceActual === null
        ? 0
        : matriz.distancias[indiceActual][elegida.parada.indiceMatriz];
    resultado.push({
      ...elegida.parada,
      llegadaEstimada: new Date(elegida.llegada),
      distanciaDesdeAnteriorMetros: Math.round(distancia),
      viajeDesdeAnteriorSegundos: Math.round(elegida.duracion),
    });
    pendientes.splice(pendientes.indexOf(elegida.parada), 1);
    indiceActual = elegida.parada.indiceMatriz;
    reloj = Math.max(elegida.llegada, elegida.parada.programadaEn.getTime());
    reloj += DURACION_VISITA_SEGUNDOS * 1000;
  }

  return resultado;
}

export function distanciaDeOrden(
  paradas: ParadaParaOptimizar[],
  matriz: MatrizRuta,
  indiceOrigen: number | null,
): number {
  let indice = indiceOrigen;
  return paradas.reduce((total, parada) => {
    const tramo =
      indice === null ? 0 : matriz.distancias[indice][parada.indiceMatriz];
    indice = parada.indiceMatriz;
    return total + tramo;
  }, 0);
}
