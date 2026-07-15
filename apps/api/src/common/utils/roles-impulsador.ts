// Reglas de roles del módulo Impulsador (funciones puras, compartidas entre
// los módulos locales e impulsador).
//
// La config por empresa (ConfigImpulsador) define QUÉ roles gestionan y qué
// roles operan. Con listas vacías aplica el comportamiento por defecto.

// Fallback histórico: roles gestores por descripción, cuando la empresa no
// configuró rolGestorIds. Debe coincidir con lo que asume el front.
export const ROLES_GESTORES_DEFECTO = [
  'GERENTE',
  'JEFE',
  'SUPERVISOR',
  'TEAMLEADER',
];

function normalizarRol(descripcion: string): string {
  return descripcion.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Gestor = puede cargar/editar locales, zonas, territorios y checklists, y
// asignar locales a usuarios. Si la empresa configuró rolGestorIds manda esa
// lista; si no, el fallback por descripción de rol.
export function esRolGestor(
  rolId: number | null,
  rolDescripcion: string | null,
  rolGestorIds: number[],
): boolean {
  if (rolGestorIds.length > 0) {
    return rolId !== null && rolGestorIds.includes(rolId);
  }
  return (
    rolDescripcion !== null &&
    ROLES_GESTORES_DEFECTO.includes(normalizarRol(rolDescripcion))
  );
}

// Operativo = puede realizar visitas a los locales que tenga asignados.
// Lista vacía = cualquier usuario asignado puede visitar.
export function esRolOperativo(
  rolId: number | null,
  rolOperativoIds: number[],
): boolean {
  return (
    rolOperativoIds.length === 0 ||
    (rolId !== null && rolOperativoIds.includes(rolId))
  );
}

// Administrador de usuarios de su empresa. La lista configurada manda;
// vacía conserva el comportamiento seguro: solo GERENTE.
export function esRolAdminUsuarios(
  rolId: number | null,
  rolDescripcion: string | null,
  rolAdminUsuarioIds: number[],
): boolean {
  if (rolAdminUsuarioIds.length > 0) {
    return rolId !== null && rolAdminUsuarioIds.includes(rolId);
  }
  return rolDescripcion?.toUpperCase() === 'GERENTE';
}
