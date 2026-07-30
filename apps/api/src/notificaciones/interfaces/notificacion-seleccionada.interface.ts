export interface NotificacionSeleccionada {
  id: number;
  comentario: string;
  reportadaEn: Date;
  leidaEn: Date | null;
  visitaTarea: {
    id: number;
    tarea: { titulo: string };
    visita: {
      usuario: { id: number; nombre: string; apellido: string };
      local: {
        id: number;
        nombre: string;
        cliente: { id: number; nombre: string };
      };
    };
  };
}
