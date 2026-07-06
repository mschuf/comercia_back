// Local geolocalizado, como lo ve el front (DTO de salida mínimo)
export interface LocalDto {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  creadoPor: { id: number; nombre: string };
  createdAt: string;
  updatedAt: string;
}

// Usuario elegible para asignarle un local (para el <select> del form)
export interface UsuarioAsignable {
  id: number;
  nombre: string;
  rol: string | null;
}
