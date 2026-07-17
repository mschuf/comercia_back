import type { RespuestaPaginada } from '../../common/utils/paginacion';

export interface VisitaActualEquipoDto {
  localNombre: string;
  clienteNombre: string;
  iniciadaEn: string;
  tareasTotal: number;
  tareasCompletadas: number;
}

export interface RepositorEquipoDto {
  id: number;
  nombreCompleto: string;
  nombreLogin: string;
  correo: string;
  celular: string;
  localesCount: number;
  visitaActual: VisitaActualEquipoDto | null;
  ultimaActividad: string | null;
}

export interface TareaEquipoDto {
  tareaId: number;
  visitaTareaId: number | null;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  estado: 'PENDIENTE' | 'COMPLETADA';
  completadaEn: string | null;
  comentario: string | null;
  tieneFoto: boolean;
  local: { id: number; nombre: string };
  cliente: { id: number; nombre: string };
  repositor: { id: number; nombre: string };
}

export interface RespuestaTareasEquipoDto extends RespuestaPaginada<TareaEquipoDto> {
  resumen: { total: number; pendientes: number; completadas: number };
}
