export function esRolAdminUsuarios(descripcion: string | null): boolean {
  return descripcion?.trim().toUpperCase() === 'GERENTE';
}
