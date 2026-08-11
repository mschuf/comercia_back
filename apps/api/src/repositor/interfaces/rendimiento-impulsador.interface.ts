export interface RendimientoImpulsadorDto {
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

export interface RendimientoImpulsadorFila {
  presentaciones_realizadas: number;
  locales_visitados: number;
  tareas_totales: number;
  tareas_completadas: number;
}
