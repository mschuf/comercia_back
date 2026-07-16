export type FuenteRuta = 'OSRM' | 'HAVERSINE';
export type EstadoParadaRuta = 'PENDIENTE' | 'ATRASADA' | 'EN_CURSO';

export interface ParadaRutaDto {
  clave: string;
  orden: number;
  local: {
    id: number;
    nombre: string;
    cliente: { id: number; nombre: string };
    zona: string | null;
    latitud: number;
    longitud: number;
  };
  programadaEn: string;
  llegadaEstimada: string;
  distanciaDesdeAnteriorMetros: number;
  viajeDesdeAnteriorSegundos: number;
  tareasActivas: number;
  estado: EstadoParadaRuta;
  visitaAbiertaId: number | null;
}

export interface RutaDiariaDto {
  fecha: string;
  generadaEn: string;
  fuente: FuenteRuta;
  usaUbicacionActual: boolean;
  totalProgramadas: number;
  totalCompletadas: number;
  distanciaTotalMetros: number;
  duracionTrasladoSegundos: number;
  ahorroEstimadoMetros: number;
  geometria: [number, number][];
  paradas: ParadaRutaDto[];
}

export interface ParadaParaOptimizar {
  clave: string;
  indiceMatriz: number;
  programadaEn: Date;
}

export interface ParadaOptimizada extends ParadaParaOptimizar {
  llegadaEstimada: Date;
  distanciaDesdeAnteriorMetros: number;
  viajeDesdeAnteriorSegundos: number;
}
