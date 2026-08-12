import { normalizarNumeroSim } from './datos-usuario';

describe('normalizarNumeroSim', () => {
  it.each(['+595972777464', '595972777464', '0972777464', '972777464'])(
    'normaliza %s al E.164 guardado en la base',
    (numero) => {
      expect(normalizarNumeroSim(numero)).toBe('+595972777464');
    },
  );

  it('descarta valores que no representan un celular válido', () => {
    expect(normalizarNumeroSim('sin-numero')).toBeNull();
  });
});
