import type { Territorio, Zona } from "@/types/territorio";

// Punto de local para el mapa (GET /impulsador/mapa)
export interface LocalMapa {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  zonaId: number | null;
  radioMetros: number | null;
  fechaVisita: string | null;
  requiereFotoPresencia: boolean;
  asignadoA: string | null;
  activo: boolean;
  tareasCount: number;
}

// Todo lo que la vista de mapa necesita en una sola llamada
export interface MapaDatos {
  territorios: Territorio[];
  zonas: Zona[];
  locales: LocalMapa[];
  esGestor: boolean;
}
