// Locales geolocalizados del módulo Impulsador (respuestas de /locales)

export interface Local {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  // Radio de verificación de presencia; null = usa el default de la config
  radioMetros: number | null;
  // Próxima visita programada por el gestor (ISO 8601)
  fechaVisita: string | null;
  requiereFotoPresencia: boolean;
  tareasCount: number;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  creadoPor: { id: number; nombre: string };
  createdAt: string;
  updatedAt: string;
}

// Ítem del checklist de un local
export interface TareaLocal {
  id: number;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
}

// Detalle con checklist (GET /locales/:id)
export interface LocalDetalle extends Local {
  tareas: TareaLocal[];
  // Radio efectivo: el del local o el default de la config de la empresa
  radioMetrosEfectivo: number;
}

export interface UsuarioAsignable {
  id: number;
  nombre: string;
  rol: string | null;
}
