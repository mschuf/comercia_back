import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import type { FotosService } from './fotos.service';
import { VisitasService } from './visitas.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const FECHA_INICIO = new Date('2026-07-17T12:00:00.000Z');

function novedad(overrides: Record<string, unknown> = {}) {
  return {
    id: 90,
    comentario: 'No hay mercaderia disponible',
    foto: 'novedad.jpg',
    reportadaEn: new Date('2026-07-17T12:15:00.000Z'),
    leidaEn: null,
    ...overrides,
  };
}

function tarea(
  overrides: Record<string, unknown> = {},
  tareaOverrides: Record<string, unknown> = {},
) {
  return {
    id: 70,
    tareaId: 8,
    completada: false,
    comentario: null,
    foto: null,
    completadaEn: null,
    novedad: null,
    tarea: {
      titulo: 'Reponer gondola',
      descripcion: 'Completar la exhibicion',
      requiereFoto: true,
      orden: 1,
      activo: true,
      ...tareaOverrides,
    },
    ...overrides,
  };
}

function visita(tareas = [tarea()], overrides: Record<string, unknown> = {}) {
  return {
    id: 50,
    localId: 30,
    usuarioId: 11,
    iniciadaEn: FECHA_INICIO,
    completadaEn: null,
    distanciaMetros: 0,
    fotoPresencia: null,
    local: {
      empresaId: 20,
      nombre: 'Local Centro',
      cliente: { nombre: 'Cliente SA' },
      latitud: -25.3,
      longitud: -57.6,
      radioMetros: 100,
      requiereFotoPresencia: false,
      fechaVisita: null,
      programacionVisita: null,
    },
    usuario: { nombre: 'Ana', apellido: 'Rojas' },
    tareas,
    ...overrides,
  };
}

const archivo = {
  fieldname: 'foto',
  originalname: 'novedad.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 128,
  destination: '',
  filename: '',
  path: '',
  buffer: Buffer.from('foto'),
  stream: undefined,
} as unknown as Express.Multer.File;

describe('VisitasService - novedades', () => {
  const prisma = {
    visita: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    visitaTarea: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    local: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const accesoCampo = {
    usuario: jest.fn(),
    usuarioSupervisor: jest.fn(),
  };
  const fotos = {
    guardar: jest.fn(),
    borrar: jest.fn(),
  };
  const service = new VisitasService(
    prisma as unknown as PrismaService,
    accesoCampo as unknown as AccesoOperacionesCampoService,
    fotos as unknown as FotosService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    accesoCampo.usuario.mockResolvedValue({
      id: 11,
      empresaId: 20,
      rolId: 6,
      esGestor: false,
      esOperativo: true,
    });
    accesoCampo.usuarioSupervisor.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 3,
      esGestor: true,
      esOperativo: false,
    });
    prisma.visita.findUnique.mockResolvedValue(visita());
    prisma.usuario.findUnique.mockResolvedValue({ superiorId: 10 });
    fotos.guardar.mockResolvedValue('novedad.jpg');
    fotos.borrar.mockResolvedValue(undefined);
    prisma.visitaTarea.findUnique.mockResolvedValue(null);
  });

  it('crea la novedad para el superior validado y devuelve la tarea actualizada', async () => {
    prisma.visitaTarea.update.mockResolvedValue(tarea({ novedad: novedad() }));

    const resultado = await service.reportarNovedad(
      11,
      50,
      70,
      { comentario: 'No hay mercaderia disponible' },
      archivo,
    );

    expect(accesoCampo.usuario).toHaveBeenCalledWith(11, ['visitas']);
    expect(accesoCampo.usuarioSupervisor).toHaveBeenCalledWith(10, 'tareas');
    expect(prisma.visitaTarea.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 70,
          completada: false,
          novedad: null,
          visita: { completadaEn: null },
          tarea: { activo: true },
        },
        data: {
          completada: false,
          completadaEn: null,
          novedad: {
            create: {
              reportadoPorId: 11,
              supervisorId: 10,
              comentario: 'No hay mercaderia disponible',
              foto: 'novedad.jpg',
            },
          },
        },
      }),
    );
    expect(resultado.novedad).toEqual({
      id: 90,
      comentario: 'No hay mercaderia disponible',
      reportadaEn: '2026-07-17T12:15:00.000Z',
      leidaEn: null,
    });
    expect(fotos.borrar).not.toHaveBeenCalled();
  });

  it('devuelve la novedad existente ante un reintento sin duplicarla', async () => {
    prisma.visita.findUnique.mockResolvedValue(
      visita([tarea({ novedad: novedad() })]),
    );

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'Otro problema' },
        archivo,
      ),
    ).resolves.toMatchObject({ novedad: { id: 90 } });

    expect(prisma.usuario.findUnique).not.toHaveBeenCalled();
    expect(fotos.guardar).not.toHaveBeenCalled();
    expect(prisma.visitaTarea.update).not.toHaveBeenCalled();
  });

  it('recupera la novedad si gana la carrera contra un guardado normal', async () => {
    prisma.visitaTarea.update.mockRejectedValue(new Error('conflicto'));
    prisma.visitaTarea.findUnique.mockResolvedValue({
      ...tarea({ novedad: novedad() }),
      visita: { completadaEn: null },
    });

    await expect(
      service.actualizarTarea(11, 50, 70, {
        comentario: 'Trabajo parcial',
      }),
    ).resolves.toMatchObject({ novedad: { id: 90 } });
  });

  it('rechaza la novedad si el repositor no tiene superior asignado', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ superiorId: null });

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'No hay mercaderia disponible' },
        archivo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(accesoCampo.usuarioSupervisor).not.toHaveBeenCalled();
    expect(fotos.guardar).not.toHaveBeenCalled();
    expect(prisma.visitaTarea.update).not.toHaveBeenCalled();
  });

  it('rechaza reportar una tarea que ya fue completada', async () => {
    prisma.visita.findUnique.mockResolvedValue(
      visita([tarea({ completada: true })]),
    );

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'Otro problema' },
        archivo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fotos.guardar).not.toHaveBeenCalled();
  });

  it('borra la foto nueva si falla la persistencia de la novedad', async () => {
    const errorPersistencia = new Error('fallo de base de datos');
    prisma.visitaTarea.update.mockRejectedValue(errorPersistencia);

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'No hay mercaderia disponible' },
        archivo,
      ),
    ).rejects.toBe(errorPersistencia);

    expect(fotos.borrar).toHaveBeenCalledTimes(1);
    expect(fotos.borrar).toHaveBeenCalledWith('novedad.jpg');
  });

  it('recupera la novedad ganadora si dos reportes compiten', async () => {
    prisma.visitaTarea.update.mockRejectedValue(new Error('conflicto'));
    prisma.visitaTarea.findUnique.mockResolvedValue(
      tarea({ novedad: novedad() }),
    );

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'No hay mercaderia disponible' },
        archivo,
      ),
    ).resolves.toMatchObject({ novedad: { id: 90 } });
    expect(fotos.borrar).toHaveBeenCalledWith('novedad.jpg');
  });

  it('no reemplaza una tarea completada por otra solicitud concurrente', async () => {
    prisma.visitaTarea.update.mockRejectedValue(new Error('conflicto'));
    prisma.visitaTarea.findUnique.mockResolvedValue(
      tarea({ completada: true }),
    );

    await expect(
      service.reportarNovedad(
        11,
        50,
        70,
        { comentario: 'No hay mercaderia disponible' },
        archivo,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fotos.borrar).toHaveBeenCalledWith('novedad.jpg');
  });

  it('permite finalizar con una tarea activa resuelta por novedad sin foto normal', async () => {
    const tareaConNovedad = tarea({ novedad: novedad(), foto: null });
    const visitaAbierta = visita([tareaConNovedad]);
    const visitaRegistrada = visita([tareaConNovedad], {
      completadaEn: new Date('2026-07-17T12:30:00.000Z'),
    });
    prisma.visita.findUnique.mockResolvedValue(visitaAbierta);
    let actualizacion: unknown;
    prisma.visita.update.mockImplementation((argumento: unknown) => {
      actualizacion = argumento;
      return Promise.resolve(visitaRegistrada);
    });
    prisma.local.update.mockResolvedValue({ id: 30 });
    prisma.$transaction.mockImplementation(
      async (operaciones: Array<Promise<unknown>>) => Promise.all(operaciones),
    );

    const resultado = await service.finalizar(11, 50, {
      latitud: -25.3,
      longitud: -57.6,
      precisionMetros: 14.26,
    });

    expect(resultado.completadaEn).toBe('2026-07-17T12:30:00.000Z');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(actualizacion).toMatchObject({
      where: { id: 50 },
      data: { precisionFinMetros: 14.3 },
    });
  });

  it('sigue rechazando finalizar cuando queda una tarea activa pendiente', async () => {
    prisma.visita.findUnique.mockResolvedValue(
      visita([tarea({ completada: false, novedad: null, foto: null })]),
    );

    await expect(
      service.finalizar(11, 50, {
        latitud: -25.3,
        longitud: -57.6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.visita.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
