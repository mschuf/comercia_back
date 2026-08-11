export interface RespuestaPaginada<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface VisitaHoy {
  clave: string;
  orden: number;
  local: {
    id: number;
    nombre: string;
    cliente: { id: number; nombre: string };
    zona: string | null;
    latitud: number;
    longitud: number;
    radioMetros: number;
  };
  programadaEn: string;
  tareasActivas: number;
  estado: string;
  visitaAbiertaId: number | null;
}

export interface TareaVisita {
  id: number;
  tareaId: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activa: boolean;
  completada: boolean;
  comentario: string | null;
  foto: string | null;
  completadaEn: string | null;
  novedad: { id: number } | null;
}

export interface Visita {
  id: number;
  localId: number;
  localNombre: string;
  clienteNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  distanciaMetros: number;
  requiereFotoPresencia: boolean;
  fotoPresencia: string | null;
  radioMetros: number;
  tareas: TareaVisita[];
}

export interface MarcacionResumen {
  id: number;
  localId: number;
  localNombre: string;
  clienteNombre: string;
  iniciadaEn: string;
  completadaEn: string | null;
  duracionMinutos: number | null;
  distanciaMetros: number;
  tareasTotal: number;
  tareasCompletadas: number;
}

export interface RendimientoImpulsador {
  desde: string;
  hasta: string;
  localesAsignados: number;
  localesVisitados: number;
  presentacionesProgramadas: number;
  presentacionesRealizadas: number;
  presentacionesPorcentaje: number;
  tareasTotales: number;
  tareasCompletadas: number;
  tareasPorcentaje: number;
  visitasEnCurso: number;
}

export interface CoordenadasMarcacion {
  latitud: number;
  longitud: number;
  precisionMetros?: number;
  registradaEn: string;
  claveMovil: string;
}
