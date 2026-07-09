// Jerarquía geográfica del módulo Impulsador (respuestas de /territorios y /zonas)

export interface Territorio {
  id: number;
  nombre: string;
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
  color: string;
  poligono: [number, number][] | null;
  activo: boolean;
  localesCount: number;
  createdAt: string;
  updatedAt: string;
}
