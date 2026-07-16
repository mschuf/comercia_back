// Visitas a locales de operaciones de campo (respuestas de /visitas)

export interface VisitaTarea {
  id: number;
  tareaId: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  completada: boolean;
  comentario: string | null;
  // Nombre de archivo; se muestra vía urlFotoVisita() de @/lib/api-archivos
  foto: string | null;
  completadaEn: string | null;
}

// Visita completa (flujo del repositor y detalle)
export interface Visita {
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
  // Radio efectivo usado para la verificación
  radioMetros: number;
  tareas: VisitaTarea[];
}

// Fila del historial de visitas (listado paginado, sin checklist)
export interface VisitaResumen {
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

export interface VisitaEquipoUltimaVisita {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  tareasTotal: number;
  tareasCompletadas: number;
}

export type FrecuenciaVisita = "UNICA" | "SEMANAL" | "MENSUAL";

export interface ProgramacionVisita {
  frecuencia: FrecuenciaVisita;
  fechaInicio: string;
  fechaFin: string | null;
  intervalo: number;
  diasSemana: number[];
  diasMes: number[];
  horarios: string[];
  zonaHoraria: string;
  activo: boolean;
}

export interface VisitaEquipoLocal {
  localId: number;
  localNombre: string;
  clienteNombre: string;
  zona: { id: number; nombre: string } | null;
  fechaVisita: string | null;
  programacion: ProgramacionVisita | null;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  ultimaVisita: VisitaEquipoUltimaVisita | null;
}
