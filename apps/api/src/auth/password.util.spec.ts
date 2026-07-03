import { hashPassword, verifyPassword } from './password.util';

describe('hash de contraseñas (scrypt)', () => {
  it('genera hashes distintos para la misma contraseña (salt aleatorio)', async () => {
    const a = await hashPassword('secreta123');
    const b = await hashPassword('secreta123');
    expect(a).not.toBe(b);
    expect(a).toContain('scrypt$');
    expect(a).not.toContain('secreta123');
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('MiClaveSegura!9');
    await expect(verifyPassword('MiClaveSegura!9', hash)).resolves.toBe(true);
    await expect(verifyPassword('MiClaveSegura!8', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('rechaza hashes corruptos o con formato desconocido', async () => {
    await expect(verifyPassword('x', 'no-es-un-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt$1$2$3$4$5')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$0$0$0$$')).resolves.toBe(false);
  });
});
