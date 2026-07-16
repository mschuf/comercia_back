import type { EstadoParadaRuta } from './ruta-diaria.interface';

export interface VisitaHoyDto {
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
