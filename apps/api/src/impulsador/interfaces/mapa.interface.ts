import { TerritorioDto } from './territorio.interface';
import { ZonaDto } from './zona.interface';

// Punto de local para el mapa (más liviano que LocalDto)
export interface LocalMapaDto {
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
export interface MapaDatosDto {
  territorios: TerritorioDto[];
  zonas: ZonaDto[];
  locales: LocalMapaDto[];
  esGestor: boolean;
}
