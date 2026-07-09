// Territorio como lo ve el front (DTO de salida mínimo)
export interface TerritorioDto {
  id: number;
  nombre: string;
  color: string;
  poligono: [number, number][] | null;
  activo: boolean;
  zonasCount: number;
  createdAt: string;
  updatedAt: string;
}
