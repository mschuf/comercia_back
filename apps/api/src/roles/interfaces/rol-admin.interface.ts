export interface RolAdminFila {
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  _count: { usuarios: number; hijos: number };
}

export interface RolAdminDto {
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  usuariosCount: number;
  hijosCount: number;
}
