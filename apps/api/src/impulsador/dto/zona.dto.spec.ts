import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ActualizarZonaDto, CrearZonaDto } from './zona.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function metadata(metatype: ArgumentMetadata['metatype']): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('DTO de zonas', () => {
  it('acepta un único repositor al crear una zona', async () => {
    await expect(
      PIPE.transform(
        { territorioId: 1, nombre: 'Centro', usuarioIds: [7] },
        metadata(CrearZonaDto),
      ),
    ).resolves.toMatchObject({
      territorioId: 1,
      nombre: 'Centro',
      usuarioIds: [7],
    });
  });

  it('permite dejar la zona sin repositor', async () => {
    await expect(
      PIPE.transform({ usuarioIds: [] }, metadata(ActualizarZonaDto)),
    ).resolves.toMatchObject({ usuarioIds: [] });
  });

  it('rechaza una selección múltiple de repositores', async () => {
    await expect(
      PIPE.transform(
        { territorioId: 1, nombre: 'Centro', usuarioIds: [7, 8] },
        metadata(CrearZonaDto),
      ),
    ).rejects.toThrow();
  });
});
