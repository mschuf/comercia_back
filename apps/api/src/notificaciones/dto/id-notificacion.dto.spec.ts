import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { IdNotificacionDto } from './id-notificacion.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const METADATA: ArgumentMetadata = {
  type: 'param',
  metatype: IdNotificacionDto,
};

describe('IdNotificacionDto', () => {
  it('transforma un id positivo dentro del rango int4', async () => {
    await expect(PIPE.transform({ id: '90' }, METADATA)).resolves.toMatchObject(
      { id: 90 },
    );
  });

  it.each(['0', '-1', '2147483648', 'abc'])(
    'rechaza ids invalidos: %s',
    async (id) => {
      await expect(PIPE.transform({ id }, METADATA)).rejects.toThrow();
    },
  );
});
