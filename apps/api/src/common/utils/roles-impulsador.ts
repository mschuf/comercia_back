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
    ROLES_GESTORES_DEFECTO.includes(rolDescripcion.toUpperCase())
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
