export interface UsuarioAdminDto {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  nombreLogin: string;
  ruc: string;
  celular: string;
  empresa: { id: number; nombre: string };
  rol: { id: number; descripcion: string } | null;
  superior: { id: number; nombre: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface MetaUsuariosDto {
  empresas: { id: number; nombre: string }[];
  roles: { id: number; descripcion: string }[];
  esSuperadmin: boolean;
}
