export type TipoToastMovil = "exito" | "advertencia" | "error";

export interface ToastMovilItem {
  id: number;
  tipo: TipoToastMovil;
  titulo: string;
  detalle?: string;
}
