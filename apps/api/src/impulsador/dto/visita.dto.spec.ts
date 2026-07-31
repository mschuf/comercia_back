import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ActualizarVisitaTareaDto, IniciarVisitaDto } from './visita.dto';

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

describe('DTO de inicio de visita', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: IniciarVisitaDto,
  };

  it('acepta la precisión reportada por el GPS', async () => {
    await expect(
      PIPE.transform(
        {
          localId: 10,
          latitud: -25.3,
          longitud: -57.6,
          precisionMetros: 18.4,
        },
        metadata,
      ),
    ).resolves.toMatchObject({ precisionMetros: 18.4 });
  });

  it('rechaza una precisión negativa', async () => {
    await expect(
      PIPE.transform(
        {
          localId: 10,
          latitud: -25.3,
          longitud: -57.6,
          precisionMetros: -1,
        },
        metadata,
      ),
    ).rejects.toThrow();
  });
});
