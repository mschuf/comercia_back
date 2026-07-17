export function puedeAdministrarUsuarios(
  esSuperadmin: boolean,
  rolDescripcion: string | null,
): boolean {
  return esSuperadmin || rolDescripcion?.trim().toUpperCase() === 'GERENTE';
}
