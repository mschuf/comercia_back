import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  ActualizarTareaGlobalDto,
  CrearTareaGlobalDto,
} from './tarea-global.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function metadata(metatype: ArgumentMetadata['metatype']): ArgumentMetadata {
  return { type: 'body', metatype };
}

describe('DTO de tareas', () => {
  it('requiere y normaliza un título separado de la descripción', async () => {
    await expect(
      PIPE.transform(
        {
          titulo: '  Controlar exhibición  ',
          descripcion: '  Verificar que los productos estén visibles.  ',
        },
        metadata(CrearTareaGlobalDto),
      ),
    ).resolves.toMatchObject({
      titulo: 'Controlar exhibición',
      descripcion: 'Verificar que los productos estén visibles.',
    });
  });

  it('rechaza crear una tarea sin título', async () => {
    await expect(
      PIPE.transform(
        { descripcion: 'Verificar la góndola.' },
        metadata(CrearTareaGlobalDto),
      ),
    ).rejects.toThrow();
  });

  it('mantiene la descripción de instrucciones como campo requerido', async () => {
    await expect(
      PIPE.transform(
        { titulo: 'Controlar exhibición' },
        metadata(CrearTareaGlobalDto),
      ),
    ).rejects.toThrow();
  });

  it('limita el título a 120 caracteres', async () => {
    await expect(
      PIPE.transform(
        { titulo: 'a'.repeat(121), descripcion: 'Descripción válida.' },
        metadata(CrearTareaGlobalDto),
      ),
    ).rejects.toThrow();
  });

  it('permite actualizar solamente el título', async () => {
    await expect(
      PIPE.transform(
        { titulo: '  Nuevo título  ' },
        metadata(ActualizarTareaGlobalDto),
      ),
    ).resolves.toMatchObject({ titulo: 'Nuevo título' });
  });

  it('acepta destinatarios y locales seleccionados sin duplicados', async () => {
    await expect(
      PIPE.transform(
        {
          titulo: 'Revisar exhibición',
          descripcion: 'Controlar el local asignado.',
          alcance: 'SELECCIONADOS',
          usuarioIds: [11, 12],
          alcanceLocales: 'SELECCIONADOS',
          localIds: [21, 22],
        },
        metadata(CrearTareaGlobalDto),
      ),
    ).resolves.toMatchObject({
      usuarioIds: [11, 12],
      localIds: [21, 22],
    });
  });

  it('rechaza locales repetidos en una tarea dirigida', async () => {
    await expect(
      PIPE.transform(
        {
          titulo: 'Revisar exhibición',
          descripcion: 'Controlar el local asignado.',
          alcanceLocales: 'SELECCIONADOS',
          localIds: [21, 21],
        },
        metadata(CrearTareaGlobalDto),
      ),
    ).rejects.toThrow();
  });
});
