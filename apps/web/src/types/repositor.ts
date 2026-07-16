import type { ProgramacionVisita } from "@/types/visita";

export interface ClienteRepositor {
  id: number;
  nombre: string;
  localesAsignados: number;
  tareasActivas: number;
  proximaVisita: string | null;
}

export interface LocalRepositor {
  id: number;
  nombre: string;
  cliente: { id: number; nombre: string };
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  fechaVisita: string | null;
  programacion: ProgramacionVisita | null;
  tareasActivas: number;
  requiereFotoPresencia: boolean;
}

export interface TareaRepositor {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
}

export interface TareasLocalRepositor {
  local: {
    id: number;
    nombre: string;
    cliente: { id: number; nombre: string };
  };
  tareas: TareaRepositor[];
  completadasEnVisita: number;
  visitaAbiertaId: number | null;
}

export type EstadoParadaRuta = "PENDIENTE" | "ATRASADA" | "EN_CURSO";

export interface VisitaHoy {
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
  tareasActivas: number;
  estado: EstadoParadaRuta;
  visitaAbiertaId: number | null;
}

export interface ParadaRuta {
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

export interface RutaDiaria {
  fecha: string;
  generadaEn: string;
  fuente: "OSRM" | "HAVERSINE";
  usaUbicacionActual: boolean;
  totalProgramadas: number;
  totalCompletadas: number;
  distanciaTotalMetros: number;
  duracionTrasladoSegundos: number;
  ahorroEstimadoMetros: number;
  geometria: [number, number][];
  paradas: ParadaRuta[];
}
