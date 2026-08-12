export interface UsuarioOperacionesCampo {
  id: number;
  empresaId: number;
  rolId: number | null;
  rolDescripcion: string | null;
  esGestor: boolean;
  esOperativo: boolean;
}
