// Configuración de operaciones de campo (GET /operaciones-campo/config).
// esGestor/esOperativo ya vienen calculados para el usuario actual: el front
// NO decide roles por su cuenta (la regla vive en el backend).
export interface ConfigImpulsador {
  rolGestorIds: number[];
  rolOperativoIds: number[];
  rolAdminUsuarioIds: number[];
  radioMetrosDefecto: number;
  esGestor: boolean;
  esOperativo: boolean;
}

// Vista del superadmin (GET/PUT /admin/operaciones-campo/config/:empresaId)
export interface ConfigImpulsadorAdmin {
  empresaId: number;
  rolGestorIds: number[];
  rolOperativoIds: number[];
  rolAdminUsuarioIds: number[];
  radioMetrosDefecto: number;
}
