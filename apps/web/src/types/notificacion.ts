export interface NotificacionNovedad {
  id: number;
  comentario: string;
  reportadaEn: string;
  leidaEn: string | null;
  tarea: {
    visitaTareaId: number;
    titulo: string;
  };
  local: {
    id: number;
    nombre: string;
  };
  cliente: {
    id: number;
    nombre: string;
  };
  repositor: {
    id: number;
    nombre: string;
  };
}
