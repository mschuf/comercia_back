export interface CoordenadaRuta {
  latitud: number;
  longitud: number;
}

export interface MatrizRuta {
  distancias: number[][];
  duraciones: number[][];
}

export interface ResultadoGeometriaRuta {
  distanciaMetros: number;
  duracionSegundos: number;
  geometria: [number, number][];
}

export interface OsrmTableResponse {
  code?: string;
  distances?: Array<Array<number | null>>;
  durations?: Array<Array<number | null>>;
}

export interface OsrmRouteResponse {
  code?: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }>;
}
