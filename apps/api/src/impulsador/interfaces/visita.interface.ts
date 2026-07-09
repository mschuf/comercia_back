// Estado de una tarea del checklist dentro de una visita
export interface VisitaTareaDto {
  id: number;
  tareaId: number;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  completada: boolean;
  comentario: string | null;
  // Nombre de archivo; se sirve autenticado por GET /visitas/fotos/:nombre
  foto: string | null;
  completadaEn: string | null;
}

// Visita completa (detalle y flujo del impulsador)
export interface VisitaDto {
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
  // Radio efectivo usado para la verificación (local o default de la config)
  radioMetros: number;
  tareas: VisitaTareaDto[];
}

// Fila del historial de visitas (listado paginado, sin el checklist)
export interface VisitaResumenDto {
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
