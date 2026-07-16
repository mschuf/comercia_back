import type { ProgramacionVisitaDto } from '../../impulsador/interfaces/programacion-visita.interface';

export interface LocalRepositorDto {
  id: number;
  nombre: string;
  cliente: { id: number; nombre: string };
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  fechaVisita: string | null;
  programacion: ProgramacionVisitaDto | null;
  tareasActivas: number;
  requiereFotoPresencia: boolean;
}
