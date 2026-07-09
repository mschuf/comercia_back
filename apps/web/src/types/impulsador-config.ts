// Configuración del módulo Impulsador (GET /impulsador/config).
// esGestor/esOperativo ya vienen calculados para el usuario actual: el front
// NO decide roles por su cuenta (la regla vive en el backend).
export interface ConfigImpulsador {
  rolGestorIds: number[];
  rolOperativoIds: number[];
  radioMetrosDefecto: number;
  esGestor: boolean;
  esOperativo: boolean;
}

// Vista del superadmin por empresa (GET/PUT /admin/impulsador/config/:empresaId)
export interface ConfigImpulsadorAdmin {
  empresaId: number;
  rolGestorIds: number[];
  rolOperativoIds: number[];
  radioMetrosDefecto: number;
}
