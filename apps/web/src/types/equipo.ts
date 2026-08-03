export interface RepositorEquipo {
  id: number;
  nombreCompleto: string;
  nombreLogin: string;
  correo: string;
  celular: string;
  localesCount: number;
  visitaActual: {
    localNombre: string;
    clienteNombre: string;
    iniciadaEn: string;
    tareasTotal: number;
    tareasCompletadas: number;
  } | null;
  ultimaActividad: string | null;
}

export type EstadoSeguimientoTarea = "PENDIENTE" | "COMPLETADA" | "NOVEDAD";

export interface TareaSeguimiento {
  tareaId: number;
  visitaTareaId: number | null;
  titulo: string;
  descripcion: string;
  orden: number;
  estado: EstadoSeguimientoTarea;
  requiereFoto: boolean;
  tieneFoto: boolean;
  completadaEn: string | null;
  comentario: string | null;
  novedad: {
    id: number;
    comentario: string;
    reportadaEn: string;
    leidaEn: string | null;
  } | null;
  local: { id: number; nombre: string };
  cliente: { id: number; nombre: string };
  repositor: { id: number; nombre: string };
}

export interface ResumenSeguimientoTareas {
  total: number;
  pendientes: number;
  completadas: number;
  novedades: number;
}

export interface ResumenEquipoOperativo {
  miembros: number;
  visitasEnCurso: number;
  tareasPendientes: number;
  novedadesSinLeer: number;
}
