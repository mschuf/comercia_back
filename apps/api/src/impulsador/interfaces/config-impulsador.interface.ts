// Config del módulo Impulsador aplicada al usuario actual (GET /impulsador/config)
export interface ConfigImpulsadorDto {
  rolGestorIds: number[];
  rolOperativoIds: number[];
  radioMetrosDefecto: number;
  // Cómo aplica al usuario que consulta
  esGestor: boolean;
  esOperativo: boolean;
}

// Vista del superadmin por empresa (GET/PUT /admin/impulsador/config/:empresaId)
export interface ConfigImpulsadorAdminDto {
  empresaId: number;
  rolGestorIds: number[];
  rolOperativoIds: number[];
  radioMetrosDefecto: number;
}
