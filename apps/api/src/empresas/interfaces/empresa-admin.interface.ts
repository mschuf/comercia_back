export interface EmpresaAdminFila {
  id: number;
  nombre: string;
  dbName: string | null;
  padre: { id: number; nombre: string } | null;
  _count: {
    usuarios: number;
    clientes: number;
    locales: number;
    hijas: number;
    tareas: number;
    territorios: number;
    zonas: number;
  };
}

export interface EmpresaAdminDto {
  id: number;
  nombre: string;
  dbName: string | null;
  padre: { id: number; nombre: string } | null;
  usuariosCount: number;
  clientesCount: number;
  localesCount: number;
  hijasCount: number;
}

export interface EmpresaJerarquiaFila {
  empresaId: number | null;
}
