// Datos mínimos del usuario ya autorizado dentro del módulo Impulsador,
// con sus permisos efectivos según la config de su empresa.
export interface UsuarioImpulsador {
  id: number;
  empresaId: number;
  rolId: number | null;
  // Puede ABM de territorios/zonas/locales/checklists y asignar locales
  esGestor: boolean;
  // Puede realizar visitas a sus locales asignados
  esOperativo: boolean;
  radioMetrosDefecto: number;
}
