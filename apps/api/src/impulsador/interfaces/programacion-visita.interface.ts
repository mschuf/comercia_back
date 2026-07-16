export type FrecuenciaProgramacionVisita = 'UNICA' | 'SEMANAL' | 'MENSUAL';

export interface ProgramacionVisitaCalculo {
  frecuencia: FrecuenciaProgramacionVisita;
  fechaInicio: Date;
  fechaFin: Date | null;
  intervalo: number;
  diasSemana: number[];
  diasMes: number[];
  horarios: string[];
  zonaHoraria: string;
  activo: boolean;
}

export interface ProgramacionVisitaDto {
  frecuencia: FrecuenciaProgramacionVisita;
  fechaInicio: string;
  fechaFin: string | null;
  intervalo: number;
  diasSemana: number[];
  diasMes: number[];
  horarios: string[];
  zonaHoraria: string;
  activo: boolean;
}
