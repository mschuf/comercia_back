// Empresa como la expone GET /empresas (solo lo que el front necesita)
export interface Empresa {
  id: number;
  nombre: string;
}

export interface EmpresaAdmin extends Empresa {
  dbName: string | null;
  padre: { id: number; nombre: string } | null;
  usuariosCount: number;
  hijasCount: number;
  configuracionCount: number;
}
