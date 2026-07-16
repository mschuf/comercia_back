import type { AgrupacionKpiVisitaDto } from '../dto/kpis-visitas.dto';

export interface KpiVisitasResumenDto {
  desde: string;
  hasta: string;
  visitasCompletadas: number;
  visitasEnCurso: number;
  usuariosActivos: number;
  localesVisitados: number;
  duracionPromedioMinutos: number;
  duracionMedianaMinutos: number;
  tiempoTotalMinutos: number;
  cumplimientoPorcentaje: number;
}

export interface KpiVisitasDetalleDto {
  agrupadoPor: AgrupacionKpiVisitaDto;
  entidadId: number;
  nombre: string;
  detalle: string | null;
  visitas: number;
  duracionPromedioMinutos: number;
  cumplimientoPorcentaje: number;
  entidadesRelacionadas: number;
}

export interface KpiVisitasResumenFila {
  visitas_completadas: number;
  usuarios_activos: number;
  locales_visitados: number;
  duracion_promedio_minutos: number;
  duracion_mediana_minutos: number;
  tiempo_total_minutos: number;
  cumplimiento_porcentaje: number;
}

export interface KpiVisitasDetalleFila {
  entidad_id: number;
  nombre: string;
  detalle: string | null;
  visitas: number;
  duracion_promedio_minutos: number;
  cumplimiento_porcentaje: number;
  entidades_relacionadas: number;
  total_grupos: number;
}
