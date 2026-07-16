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
  };
  tareas: TareaRepositorDto[];
  completadasEnVisita: number;
  visitaAbiertaId: number | null;
}
