export interface RolAdmin {
  id: number;
  descripcion: string;
  padre: { id: number; descripcion: string } | null;
  usuariosCount: number;
  hijosCount: number;
}
