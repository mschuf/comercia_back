// Jerarquía geográfica de operaciones de campo (/territorios y /zonas)

export interface Territorio {
  id: number;
  nombre: string;
  responsable: { id: number; nombre: string } | null;
  // Color de relleno en el mapa (hex #rrggbb)
  color: string;
  // Vértices [[lat, lng], ...]; null = sin delimitar todavía
  poligono: [number, number][] | null;
  activo: boolean;
  zonasCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zona {
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
