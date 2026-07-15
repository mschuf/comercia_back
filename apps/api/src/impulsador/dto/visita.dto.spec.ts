import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ActualizarVisitaTareaDto } from './visita.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const METADATA: ArgumentMetadata = {
  type: 'body',
  metatype: ActualizarVisitaTareaDto,
};

describe('DTO de respuesta de una tarea visitada', () => {
  it('normaliza la descripción de lo realizado en el campo comentario', async () => {
    await expect(
      PIPE.transform(
        { comentario: '  Organicé y repuse la góndola.  ' },
        METADATA,
      ),
    ).resolves.toMatchObject({
      comentario: 'Organicé y repuse la góndola.',
    });
  });

  it('limita la descripción de lo realizado a 500 caracteres', async () => {
    await expect(
      PIPE.transform({ comentario: 'a'.repeat(501) }, METADATA),
    ).rejects.toThrow();
  });
});
