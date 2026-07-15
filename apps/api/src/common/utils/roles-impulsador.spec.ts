import {
  esRolAdminUsuarios,
  esRolGestor,
  esRolOperativo,
} from './roles-impulsador';

describe('esRolGestor', () => {
  it('sin config usa el fallback por descripción (case-insensitive)', () => {
    expect(esRolGestor(5, 'teamleader', [])).toBe(true);
    expect(esRolGestor(5, 'Team Leader', [])).toBe(true);
    expect(esRolGestor(5, 'TEAM_LEADER', [])).toBe(true);
    expect(esRolGestor(5, 'GERENTE', [])).toBe(true);
    expect(esRolGestor(5, 'IMPULSADOR', [])).toBe(false);
    expect(esRolGestor(5, null, [])).toBe(false);
  });

  it('con config manda la lista de ids, no la descripción', () => {
    expect(esRolGestor(5, 'IMPULSADOR', [5])).toBe(true);
    expect(esRolGestor(5, 'TEAMLEADER', [9])).toBe(false);
    expect(esRolGestor(null, 'TEAMLEADER', [9])).toBe(false);
  });
});

describe('esRolAdminUsuarios', () => {
  it('usa GERENTE como fallback seguro', () => {
    expect(esRolAdminUsuarios(1, 'GERENTE', [])).toBe(true);
    expect(esRolAdminUsuarios(2, 'TEAMLEADER', [])).toBe(false);
  });

  it('respeta la configuración explícita por empresa', () => {
    expect(esRolAdminUsuarios(4, 'TEAMLEADER', [4])).toBe(true);
    expect(esRolAdminUsuarios(1, 'GERENTE', [4])).toBe(false);
  });
});

describe('esRolOperativo', () => {
  it('lista vacía = cualquier usuario asignado puede visitar', () => {
    expect(esRolOperativo(5, [])).toBe(true);
    expect(esRolOperativo(null, [])).toBe(true);
  });

  it('con lista, el rol debe estar incluido', () => {
    expect(esRolOperativo(5, [5, 6])).toBe(true);
    expect(esRolOperativo(7, [5, 6])).toBe(false);
    expect(esRolOperativo(null, [5])).toBe(false);
  });
});
