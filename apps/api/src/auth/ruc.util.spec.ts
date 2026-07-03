import { calcularDvRucPy, esRucParaguayoValido } from './ruc.util';

describe('RUC paraguayo', () => {
  it('acepta un RUC cuyo dígito verificador coincide con el calculado', () => {
    for (const base of ['80012345', '1234567', '4895', '999999']) {
      const dv = calcularDvRucPy(base);
      expect(esRucParaguayoValido(`${base}-${dv}`)).toBe(true);
    }
  });

  it('rechaza un dígito verificador incorrecto', () => {
    const base = '80012345';
    const dv = calcularDvRucPy(base);
    const dvMalo = (dv + 1) % 10;
    expect(esRucParaguayoValido(`${base}-${dvMalo}`)).toBe(false);
  });

  it('rechaza formatos inválidos', () => {
    expect(esRucParaguayoValido('')).toBe(false);
    expect(esRucParaguayoValido('sin-numeros')).toBe(false);
    expect(esRucParaguayoValido('12345678')).toBe(false); // sin guion ni DV
    expect(esRucParaguayoValido('123456789-1')).toBe(false); // base muy larga
    expect(esRucParaguayoValido('12-3')).toBe(false); // base muy corta
  });

  it('el DV siempre está entre 0 y 9', () => {
    for (let i = 0; i < 50; i++) {
      const base = String(1000 + i * 137);
      const dv = calcularDvRucPy(base);
      expect(dv).toBeGreaterThanOrEqual(0);
      expect(dv).toBeLessThanOrEqual(9);
    }
  });
});
