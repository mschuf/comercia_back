import type { Territorio, Zona } from "@/types/territorio";

// Punto de local para el mapa (GET /operaciones-campo/mapa)
export interface LocalMapa {
  id: number;
  nombre: string;
  clienteNombre: string;
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
