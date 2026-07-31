export type TipoToast = "exito" | "error" | "alerta" | "info";

export interface ToastEntrada {
  tipo: TipoToast;
  mensaje: string;
  titulo?: string;
  clave?: string;
}

export interface ToastItem extends ToastEntrada {
  id: number;
}

export interface ToastContexto {
  mostrarToast: (toast: ToastEntrada) => number;
  cerrarToast: (id: number) => void;
  cerrarToastPorClave: (clave: string) => void;
}
