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

export interface FilaPresentismoDto extends MetricaPresentismoDto {
  usuario: {
    id: number;
    nombre: string;
    rol: string | null;
  };
  teamleader: { id: number; nombre: string } | null;
  localesAsignados: number;
}
