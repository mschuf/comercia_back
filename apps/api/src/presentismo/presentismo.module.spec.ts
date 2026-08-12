import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PresentismoModule', () => {
  it('importa AuthModule para resolver JwtAuthGuard', () => {
    const codigo = readFileSync(
      join(__dirname, 'presentismo.module.ts'),
      'utf8',
    );

    expect(codigo).toContain(
      "import { AuthModule } from '../auth/auth.module';",
    );
    expect(codigo).toMatch(/imports:\s*\[[^\]]*AuthModule[^\]]*\]/);
  });
});
