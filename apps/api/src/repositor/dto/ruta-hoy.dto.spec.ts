import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { RutaHoyDto } from './ruta-hoy.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const METADATA: ArgumentMetadata = {
  type: 'query',
  metatype: RutaHoyDto,
};

describe('RutaHoyDto', () => {
  it('convierte el indicador de recálculo explícito', async () => {
    await expect(
      PIPE.transform({ recalcular: 'true' }, METADATA),
    ).resolves.toMatchObject({ recalcular: 'true' });
  });

  it('rechaza valores booleanos ambiguos', async () => {
    await expect(
      PIPE.transform({ recalcular: 'false' }, METADATA),
    ).rejects.toThrow();
  });
});
