// Estado de una tarea del checklist dentro de una visita
export interface VisitaTareaDto {
  id: number;
  tareaId: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activa: boolean;
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
  duracionMinutos: number | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  requiereFotoPresencia: boolean;
  // Radio efectivo usado para la verificación (local o predeterminado general)
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
  duracionMinutos: number | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
}

export interface VisitaEquipoUltimaVisitaDto {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  duracionMinutos: number | null;
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
  programacion: ProgramacionVisitaDto | null;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  ultimaVisita: VisitaEquipoUltimaVisitaDto | null;
}
import type { ProgramacionVisitaDto } from './programacion-visita.interface';
