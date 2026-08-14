export interface MetricaPresentismoDto {
  desde: string;
  hasta: string;
  programadas: number;
  entradas: number;
  salidas: number;
  porcentaje: number;
}

export interface ResumenPresentismoDto {
  fechaCorte: string;
  dia: MetricaPresentismoDto;
  semana: MetricaPresentismoDto;
  mes: MetricaPresentismoDto;
}

export type PerfilResumenInicioDto =
  'SUPERVISOR' | 'TEAMLEADER' | 'IMPULSADOR' | 'GESTOR' | 'OPERATIVO';

export interface ResumenInicioOperativoDto extends ResumenPresentismoDto {
  perfil: PerfilResumenInicioDto;
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

export interface FilaPresentismoDto extends MetricaPresentismoDto {
  usuario: {
    id: number;
    nombre: string;
    rol: string | null;
  };
  teamleader: { id: number; nombre: string } | null;
  localesAsignados: number;
}

export interface UsuarioFilaPresentismo {
  id: number;
  nombre: string;
  apellido: string;
  rol: { descripcion: string } | null;
  superior: { id: number; nombre: string; apellido: string } | null;
  _count: { localesAsignados: number };
}

export interface AcumuladoPresentismo {
  programadas: number;
  entradas: number;
  salidas: number;
}

export type EstadoJornadaPresentismo =
  'COMPLETADA' | 'EN_CURSO' | 'PENDIENTE' | 'ATRASADA' | 'NO_PROGRAMADA';

export interface LocalJornadaPresentismo {
  id: number;
  nombre: string;
  fechaVisita: Date | null;
  programacionVisita: {
    frecuencia: 'UNICA' | 'SEMANAL' | 'MENSUAL';
    fechaInicio: Date;
    fechaFin: Date | null;
    intervalo: number;
    diasSemana: number[];
    diasMes: number[];
    horarios: string[];
    zonaHoraria: string;
    activo: boolean;
  } | null;
  cliente: { nombre: string };
}

export interface VisitaJornadaPresentismo {
  id: number;
  localId: number;
  iniciadaEn: Date;
  completadaEn: Date | null;
  local: { id: number; nombre: string; cliente: { nombre: string } };
}

export interface JornadaPresentismoDto {
  id: string;
  local: { id: number; nombre: string; clienteNombre: string };
  programadaEn: string | null;
  entradaEn: string | null;
  salidaEn: string | null;
  estado: EstadoJornadaPresentismo;
}
