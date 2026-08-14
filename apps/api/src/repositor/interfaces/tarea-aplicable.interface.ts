export interface TareaAplicable {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  alcanceLocales: 'TODOS' | 'CLIENTE' | 'SELECCIONADOS';
  clienteId: number | null;
  locales: { localId: number }[];
}

export interface LocalReferenciaTarea {
  id: number;
  clienteId: number;
}
