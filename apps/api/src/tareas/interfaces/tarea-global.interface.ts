export interface TareaGlobalDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  alcance: 'TODOS' | 'SELECCIONADOS';
  destinatarios: { id: number; nombre: string }[];
  usuariosAsignados: number;
  clientesAsignados: number;
  clientesEmpresa: number;
  localesEmpresa: number;
  createdAt: string;
  updatedAt: string;
}
