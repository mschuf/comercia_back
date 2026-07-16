export interface UsuarioOperacionesCampo {
  id: number;
  empresaId: number;
  rolId: number | null;
  esGestor: boolean;
  esOperativo: boolean;
}
