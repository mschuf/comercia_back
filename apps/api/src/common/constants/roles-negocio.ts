export const ROL_SUPERVISOR_IMPULSADOR = 'supervisor.impulsador';
export const ROL_TEAMLEADER_IMPULSADOR = 'teamleader.impulsador';
export const ROL_IMPULSADOR = 'impulsador';
export const ROL_REPOSITOR = 'repositor';

export const ROLES_MARCACION_SIMPLE = [
  ROL_TEAMLEADER_IMPULSADOR,
  ROL_IMPULSADOR,
] as const;

export function esRolMarcacionSimple(rol: string | null): boolean {
  return ROLES_MARCACION_SIMPLE.some((descripcion) => descripcion === rol);
}
