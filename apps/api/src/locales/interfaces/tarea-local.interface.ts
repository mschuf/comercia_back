// Ítem del checklist de un local (DTO de salida)
export interface TareaLocalDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
}
