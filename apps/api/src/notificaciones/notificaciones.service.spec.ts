import { NotFoundException } from '@nestjs/common';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { FotosService } from '../impulsador/fotos.service';
import type { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from './notificaciones.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('NotificacionesService', () => {
  const prisma = {
    novedadTarea: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const accesoCampo = {
    usuarioSupervisor: jest.fn(),
    usuario: jest.fn(),
  };
  const fotos = {
    rutaAbsoluta: jest.fn(),
  };
  const service = new NotificacionesService(
    prisma as unknown as PrismaService,
    accesoCampo as unknown as AccesoOperacionesCampoService,
    fotos as unknown as FotosService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    accesoCampo.usuarioSupervisor.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 3,
      esGestor: true,
      esOperativo: false,
    });
    accesoCampo.usuario.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 3,
      esGestor: true,
      esOperativo: false,
    });
    prisma.novedadTarea.updateMany.mockResolvedValue({ count: 1 });
  });

  it('pagina solo las novedades dirigidas al supervisor en su empresa', async () => {
    prisma.novedadTarea.count.mockResolvedValue(8);
    prisma.novedadTarea.findMany.mockResolvedValue([
      {
        id: 90,
        comentario: 'No habia mercaderia',
        reportadaEn: new Date('2026-07-17T13:00:00.000Z'),
        leidaEn: null,
        visitaTarea: {
          id: 80,
          tarea: { titulo: 'Reponer gondola' },
          visita: {
            usuario: { id: 11, nombre: 'Ana', apellido: 'Rojas' },
            local: {
              id: 30,
              nombre: 'Centro',
              cliente: { id: 40, nombre: 'Cliente SA' },
            },
          },
        },
      },
    ]);

    const respuesta = await service.listar(10, { page: 2, limit: 7 });

    expect(accesoCampo.usuarioSupervisor).toHaveBeenCalledWith(10, 'tareas');
    const scope = {
      supervisorId: 10,
      visitaTarea: { visita: { local: { empresaId: 20 } } },
    };
    expect(prisma.novedadTarea.count).toHaveBeenCalledWith({ where: scope });
    expect(prisma.novedadTarea.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: scope,
        orderBy: [{ reportadaEn: 'desc' }, { id: 'desc' }],
        skip: 7,
        take: 7,
      }),
    );
    expect(respuesta).toEqual({
      items: [
        {
          id: 90,
          comentario: 'No habia mercaderia',
          reportadaEn: '2026-07-17T13:00:00.000Z',
          leidaEn: null,
          tarea: { visitaTareaId: 80, titulo: 'Reponer gondola' },
          local: { id: 30, nombre: 'Centro' },
          cliente: { id: 40, nombre: 'Cliente SA' },
          repositor: { id: 11, nombre: 'Ana Rojas' },
        },
      ],
      total: 8,
      page: 2,
      limit: 7,
      totalPages: 2,
    });
  });

  it('cuenta no leidas dentro del mismo alcance aislado', async () => {
    prisma.novedadTarea.count.mockResolvedValue(3);

    await expect(service.noLeidas(10)).resolves.toEqual({ noLeidas: 3 });
    expect(prisma.novedadTarea.count).toHaveBeenCalledWith({
      where: {
        supervisorId: 10,
        leidaEn: null,
        visitaTarea: { visita: { local: { empresaId: 20 } } },
      },
    });
  });

  it('responde 404 neutro al intentar leer una novedad ajena', async () => {
    prisma.novedadTarea.findFirst.mockResolvedValue(null);

    await expect(service.marcarLeida(10, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.novedadTarea.findFirst).toHaveBeenCalledWith({
      where: {
        id: 999,
        supervisorId: 10,
        visitaTarea: { visita: { local: { empresaId: 20 } } },
      },
      select: { id: true, leidaEn: true },
    });
    expect(prisma.novedadTarea.updateMany).not.toHaveBeenCalled();
  });

  it('marca la novedad como leida y es idempotente si ya estaba leida', async () => {
    prisma.novedadTarea.findFirst.mockResolvedValueOnce({
      id: 90,
      leidaEn: null,
    });
    const primeraLectura = await service.marcarLeida(10, 90);

    expect(prisma.novedadTarea.updateMany).toHaveBeenCalledWith({
      where: {
        id: 90,
        supervisorId: 10,
        visitaTarea: { visita: { local: { empresaId: 20 } } },
        leidaEn: null,
      },
      data: { leidaEn: new Date(primeraLectura.leidaEn) },
    });
    expect(primeraLectura.id).toBe(90);
    expect(Number.isNaN(Date.parse(primeraLectura.leidaEn))).toBe(false);

    jest.clearAllMocks();
    accesoCampo.usuarioSupervisor.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 3,
      esGestor: true,
      esOperativo: false,
    });
    prisma.novedadTarea.findFirst.mockResolvedValue({
      id: 90,
      leidaEn: new Date('2026-07-17T14:00:00.000Z'),
    });

    await expect(service.marcarLeida(10, 90)).resolves.toEqual({
      id: 90,
      leidaEn: '2026-07-17T14:00:00.000Z',
    });
    expect(prisma.novedadTarea.updateMany).not.toHaveBeenCalled();
  });

  it('devuelve la fecha persistida si otra solicitud la marca como leida primero', async () => {
    const leidaEnConcurrente = new Date('2026-07-17T15:00:00.000Z');
    prisma.novedadTarea.findFirst
      .mockResolvedValueOnce({ id: 90, leidaEn: null })
      .mockResolvedValueOnce({ id: 90, leidaEn: leidaEnConcurrente });
    prisma.novedadTarea.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.marcarLeida(10, 90)).resolves.toEqual({
      id: 90,
      leidaEn: leidaEnConcurrente.toISOString(),
    });
    expect(prisma.novedadTarea.findFirst).toHaveBeenCalledTimes(2);
  });

  it('sirve la foto al reportante, destinatario o supervisor actual', async () => {
    prisma.novedadTarea.findFirst.mockResolvedValue({ foto: 'foto.jpg' });
    fotos.rutaAbsoluta.mockReturnValue(
      'C:\\uploads\\visitas\\00000000-0000-0000-0000-000000000000.jpg',
    );

    await expect(service.rutaFoto(10, 90)).resolves.toContain('.jpg');
    expect(accesoCampo.usuario).toHaveBeenCalledWith(10, ['visitas', 'tareas']);
    expect(prisma.novedadTarea.findFirst).toHaveBeenCalledWith({
      where: {
        id: 90,
        visitaTarea: { visita: { local: { empresaId: 20 } } },
        OR: [
          { reportadoPorId: 10 },
          { supervisorId: 10 },
          {
            reportadoPor: {
              is: { empresaId: 20, superiorId: 10 },
            },
          },
        ],
      },
      select: { foto: true },
    });
    expect(fotos.rutaAbsoluta).toHaveBeenCalledWith('foto.jpg');
  });

  it('responde 404 neutro si la foto pertenece a otra persona', async () => {
    prisma.novedadTarea.findFirst.mockResolvedValue(null);

    await expect(service.rutaFoto(10, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fotos.rutaAbsoluta).not.toHaveBeenCalled();
  });

  it('responde 404 neutro si la foto ya no existe en disco', async () => {
    prisma.novedadTarea.findFirst.mockResolvedValue({ foto: 'foto.jpg' });
    fotos.rutaAbsoluta.mockReturnValue(null);

    await expect(service.rutaFoto(10, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
