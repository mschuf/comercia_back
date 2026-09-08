export interface RolAdmin {
  empresa: { id: number; nombre: string };
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  usuariosCount: number;
  hijosCount: number;
}

export interface FormRol {
  empresaId: number | "";
  descripcion: string;
  rolId: number | "";
}
