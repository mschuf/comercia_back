import { puedeAdministrarUsuarios } from './permisos-usuario';

describe('puedeAdministrarUsuarios', () => {
  it('permite a superadmins y al rol Gerente', () => {
    expect(puedeAdministrarUsuarios(true, null)).toBe(true);
    expect(puedeAdministrarUsuarios(false, ' gerente ')).toBe(true);
  });

  it('no concede el permiso a un Supervisor', () => {
    expect(puedeAdministrarUsuarios(false, 'SUPERVISOR')).toBe(false);
  });
});
