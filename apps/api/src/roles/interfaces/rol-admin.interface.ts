export interface RolAdminFila {
  empresa: { id: number; nombre: string };
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  _count: { usuarios: number; hijos: number };
}

export interface RolAdminDto {
  empresa: { id: number; nombre: string };
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  usuariosCount: number;
  hijosCount: number;
}
