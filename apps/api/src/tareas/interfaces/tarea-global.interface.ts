export interface TareaGlobalDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  editable: boolean;
  alcance: 'TODOS' | 'SELECCIONADOS';
  destinatarios: { id: number; nombre: string }[];
  alcanceLocales: 'TODOS' | 'SELECCIONADOS';
  locales: { id: number; nombre: string }[];
  usuariosAsignados: number;
  localesAsignados: number;
  clientesAsignados: number;
  clientesEmpresa: number;
  localesEmpresa: number;
  createdAt: string;
  updatedAt: string;
}
