// Estado de una tarea del checklist dentro de una visita
export interface VisitaTareaDto {
  id: number;
  tareaId: number;
  titulo: string;
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
  clienteNombre: string;
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
  clienteNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
}

export interface VisitaEquipoTareaDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  completada: boolean;
}

export interface VisitaEquipoUltimaVisitaDto {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
}

// Resumen por local para seguimiento del gestor/teamleader.
export interface VisitaEquipoLocalDto {
  localId: number;
  localNombre: string;
  clienteNombre: string;
  zona: { id: number; nombre: string } | null;
  fechaVisita: string | null;
  requiereFotoPresencia: boolean;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  ultimaVisita: VisitaEquipoUltimaVisitaDto | null;
  tareas: VisitaEquipoTareaDto[];
}
