import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ActualizarClienteDto, CrearClienteDto } from './cliente.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function metadata(metatype: ArgumentMetadata['metatype']): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('DTO de clientes', () => {
  it('crea un cliente usando solamente el nombre', async () => {
    await expect(
      PIPE.transform({ nombre: '  Biggie  ' }, metadata(CrearClienteDto)),
    ).resolves.toMatchObject({ nombre: 'Biggie' });
  });

  it('actualiza solamente los campos propios del cliente', async () => {
    await expect(
      PIPE.transform(
        { nombre: '  Biggie Palma  ', activo: false },
        metadata(ActualizarClienteDto),
      ),
    ).resolves.toMatchObject({ nombre: 'Biggie Palma', activo: false });
  });
});
