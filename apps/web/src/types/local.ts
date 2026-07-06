// Locales geolocalizados del módulo Impulsador (respuestas de /locales)

export interface Local {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  creadoPor: { id: number; nombre: string };
  createdAt: string;
  updatedAt: string;
}

export interface UsuarioAsignable {
  id: number;
  nombre: string;
  rol: string | null;
}

// Roles que pueden gestionar locales (ABM). Debe coincidir con el backend
// (apps/api/src/locales/locales.service.ts). El resto solo ve los suyos.
export const ROLES_GESTORES_LOCALES = [
  "GERENTE",
  "JEFE",
  "SUPERVISOR",
  "TEAMLEADER",
];
