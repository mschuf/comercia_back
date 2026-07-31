import type { ProgramacionVisitaDto } from '../../impulsador/interfaces/programacion-visita.interface';

export interface TareaRepositorDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
}

export interface TareasLocalRepositorDto {
  local: {
    id: number;
    nombre: string;
    cliente: { id: number; nombre: string };
    zona: { id: number; nombre: string } | null;
    fechaVisita: string | null;
    programacion: ProgramacionVisitaDto | null;
    requiereFotoPresencia: boolean;
  };
  tareas: TareaRepositorDto[];
  completadasEnVisita: number;
  visitaAbiertaId: number | null;
  visitaCompletadaHoy: boolean;
}
