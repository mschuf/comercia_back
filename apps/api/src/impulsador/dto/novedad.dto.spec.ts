import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  ParametrosNovedadTareaDto,
  ReportarNovedadTareaDto,
} from './novedad.dto';

const PIPE = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const METADATA: ArgumentMetadata = {
  type: 'body',
  metatype: ReportarNovedadTareaDto,
};

const METADATA_PARAMETROS: ArgumentMetadata = {
  type: 'param',
  metatype: ParametrosNovedadTareaDto,
};

describe('ReportarNovedadTareaDto', () => {
  it('recorta el comentario obligatorio', async () => {
    await expect(
      PIPE.transform({ comentario: '  Local cerrado  ' }, METADATA),
    ).resolves.toMatchObject({ comentario: 'Local cerrado' });
  });

  it.each(['', '   ', 'a'.repeat(501)])(
    'rechaza un comentario vacío o fuera de rango',
    async (comentario) => {
      await expect(PIPE.transform({ comentario }, METADATA)).rejects.toThrow();
    },
  );

  it('rechaza campos que pretendan elegir el destinatario', async () => {
    await expect(
      PIPE.transform({ comentario: 'Sin stock', supervisorId: 99 }, METADATA),
    ).rejects.toThrow();
  });
});

describe('ParametrosNovedadTareaDto', () => {
  it('transforma ids positivos dentro del rango int4', async () => {
    await expect(
      PIPE.transform({ id: '50', visitaTareaId: '70' }, METADATA_PARAMETROS),
    ).resolves.toMatchObject({ id: 50, visitaTareaId: 70 });
  });

  it.each(['0', '-1', '2147483648', 'abc'])(
    'rechaza ids invalidos: %s',
    async (id) => {
      await expect(
        PIPE.transform({ id, visitaTareaId: '70' }, METADATA_PARAMETROS),
      ).rejects.toThrow();
    },
  );
});
