// Zona como la ve el front (DTO de salida mínimo)
export interface ZonaDto {
  id: number;
  territorioId: number;
  territorioNombre: string;
  nombre: string;
  repositores: { id: number; nombre: string }[];
  color: string;
  poligono: [number, number][] | null;
  activo: boolean;
  localesCount: number;
  createdAt: string;
  updatedAt: string;
}
