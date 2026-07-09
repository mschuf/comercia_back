// Visitas a locales del módulo Impulsador (respuestas de /visitas)

export interface VisitaTarea {
  id: number;
  tareaId: number;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  completada: boolean;
  comentario: string | null;
  // Nombre de archivo; se muestra vía urlFotoVisita() de @/lib/api-archivos
  foto: string | null;
  completadaEn: string | null;
}

// Visita completa (flujo del impulsador y detalle)
export interface Visita {
  id: number;
  localId: number;
  localNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  requiereFotoPresencia: boolean;
  // Radio efectivo usado para la verificación
  radioMetros: number;
  tareas: VisitaTarea[];
}

// Fila del historial de visitas (listado paginado, sin checklist)
export interface VisitaResumen {
  id: number;
  localId: number;
  localNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
}
