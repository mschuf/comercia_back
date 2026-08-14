export interface MetricaPresentismo {
  desde: string;
  hasta: string;
  programadas: number;
  entradas: number;
  salidas: number;
  porcentaje: number;
}

export interface ResumenPresentismo {
  fechaCorte: string;
  dia: MetricaPresentismo;
  semana: MetricaPresentismo;
  mes: MetricaPresentismo;
}

export type PerfilResumenInicio =
  | "SUPERVISOR"
  | "TEAMLEADER"
  | "IMPULSADOR"
  | "GESTOR"
  | "OPERATIVO";

export interface ResumenInicioOperativo extends ResumenPresentismo {
  perfil: PerfilResumenInicio;
  alcance: {
    personas: number;
    teamleaders: number;
    impulsadores: number;
    localesAsignados: number;
  };
  actividad: {
    enCurso: number;
  };
}

export interface FilaPresentismo extends MetricaPresentismo {
  usuario: { id: number; nombre: string; rol: string | null };
  teamleader: { id: number; nombre: string } | null;
  localesAsignados: number;
}

export type EstadoJornadaPresentismo =
  | "COMPLETADA"
  | "EN_CURSO"
  | "PENDIENTE"
  | "ATRASADA"
  | "NO_PROGRAMADA";

export interface JornadaPresentismo {
  id: string;
  local: { id: number; nombre: string; clienteNombre: string };
  programadaEn: string | null;
  entradaEn: string | null;
  salidaEn: string | null;
  estado: EstadoJornadaPresentismo;
}
