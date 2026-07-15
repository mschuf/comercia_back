export interface TareaGlobalDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  clientesAsignados: number;
  clientesEmpresa: number;
  localesEmpresa: number;
  createdAt: string;
  updatedAt: string;
}
