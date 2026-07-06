import { rolVe } from './visibilidad';

describe('rolVe', () => {
  it('rolIds vacío = visible para todos los roles', () => {
    expect(rolVe([], 5)).toBe(true);
    expect(rolVe([], null)).toBe(true);
  });

  it('rol incluido en la lista ve', () => {
    expect(rolVe([5, 7], 5)).toBe(true);
    expect(rolVe([5, 7], 7)).toBe(true);
  });

  it('rol NO incluido no ve (fail-closed)', () => {
    expect(rolVe([5, 7], 1)).toBe(false);
  });

  it('usuario sin rol no ve una lista restringida', () => {
    expect(rolVe([5, 7], null)).toBe(false);
  });
});
