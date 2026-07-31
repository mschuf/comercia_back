import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { OsrmService } from './osrm.service';
import { RepositorService } from './repositor.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('RepositorService', () => {
  const prisma = {
    local: { count: jest.fn(), findMany: jest.fn() },
    visita: { findMany: jest.fn() },
    rutaDiariaRepositor: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const acceso = { usuarioRepositor: jest.fn() };
  const osrm = { tabla: jest.fn(), ruta: jest.fn() };
  const service = new RepositorService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoOperacionesCampoService,
    osrm as unknown as OsrmService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    acceso.usuarioRepositor.mockResolvedValue({
      id: 1,
      empresaId: 2,
      rolId: 6,
      esGestor: false,
      esOperativo: true,
    });
    prisma.rutaDiariaRepositor.findUnique.mockResolvedValue(null);
    prisma.rutaDiariaRepositor.upsert.mockResolvedValue({ id: 1 });
    prisma.rutaDiariaRepositor.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('lista las visitas del mapa sin calcular distancias ni consultar OSRM', async () => {
    prisma.local.findMany.mockResolvedValue([
      {
        id: 10,
        nombre: 'Local Centro',
        latitud: -25.3,
        longitud: -57.6,
        fechaVisita: new Date(),
        zona: { nombre: 'Centro' },
        programacionVisita: null,
        cliente: {
          id: 20,
          nombre: 'Cliente Uno',
          _count: { tareas: 3 },
        },
      },
    ]);
    prisma.visita.findMany.mockResolvedValue([]);

    const respuesta = await service.visitasHoy(1, { page: 1, limit: 7 });

    expect(respuesta.total).toBe(1);
    expect(respuesta.items[0]).toMatchObject({
      local: { id: 10, nombre: 'Local Centro' },
      tareasActivas: 3,
    });
    expect(osrm.tabla).not.toHaveBeenCalled();
    expect(osrm.ruta).not.toHaveBeenCalled();
  });

  it('marca como completadas las tareas del local visitado hoy', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-30T15:00:00.000Z'));
    prisma.local.count.mockResolvedValue(1);
    prisma.local.findMany.mockResolvedValue([
      {
        id: 10,
        nombre: 'Local Centro',
        cliente: {
          id: 20,
          nombre: 'Cliente Uno',
          tareas: [
            {
              id: 30,
              titulo: 'Revisar exhibiciÃ³n',
              descripcion: '',
              requiereFoto: false,
              orden: 1,
            },
          ],
        },
        visitas: [
          {
            id: 40,
            completadaEn: new Date('2026-07-30T14:30:00.000Z'),
            tareas: [{ completada: true }],
          },
        ],
      },
    ]);

    try {
      const respuesta = await service.tareas(1, { page: 1, limit: 7 });

      expect(respuesta.items[0]).toMatchObject({
        visitaAbiertaId: null,
        visitaCompletadaHoy: true,
        completadasEnVisita: 0,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('usa la ubicación actual como origen y comienza por el local vencido más cercano', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T20:00:00.000Z'));
    prisma.local.findMany.mockResolvedValue([
      {
        id: 10,
        nombre: 'Paseo la galería',
        latitud: -25.284569,
        longitud: -57.563215,
        fechaVisita: new Date('2026-07-16T18:00:00.000Z'),
        zona: { nombre: 'Paseo' },
        programacionVisita: null,
        cliente: {
          id: 20,
          nombre: 'Biggie',
          _count: { tareas: 2 },
        },
      },
      {
        id: 11,
        nombre: 'Juan Valdez Centro',
        latitud: -25.286348,
        longitud: -57.639226,
        fechaVisita: new Date('2026-07-16T23:00:00.000Z'),
        zona: { nombre: 'Centro' },
        programacionVisita: null,
        cliente: {
          id: 21,
          nombre: 'Juan Valdez',
          _count: { tareas: 2 },
        },
      },
    ]);
    prisma.visita.findMany.mockResolvedValue([]);
    osrm.tabla.mockResolvedValue({
      distancias: [
        [0, 80, 9_700],
        [80, 0, 9_600],
        [9_700, 9_600, 0],
      ],
      duraciones: [
        [0, 30, 720],
        [30, 0, 710],
        [720, 710, 0],
      ],
    });
    osrm.ruta.mockResolvedValue({
      distanciaMetros: 9_680,
      duracionSegundos: 740,
      geometria: [
        [-25.2844, -57.56259],
        [-25.284569, -57.563215],
        [-25.286348, -57.639226],
      ],
    });
    let guardada:
      | {
          firmaAgenda: string;
          datos: unknown;
        }
      | undefined;
    prisma.rutaDiariaRepositor.upsert.mockImplementation(
      (argumento: unknown) => {
        guardada = (
          argumento as {
            create: { firmaAgenda: string; datos: unknown };
          }
        ).create;
        return Promise.resolve({ id: 1 });
      },
    );

    try {
      const respuesta = await service.rutaHoy(1, {
        latitud: -25.2844,
        longitud: -57.56259,
      });

      expect(osrm.tabla).toHaveBeenCalledWith([
        { latitud: -25.2844, longitud: -57.56259 },
        { latitud: -25.284569, longitud: -57.563215 },
        { latitud: -25.286348, longitud: -57.639226 },
      ]);
      expect(respuesta.usaUbicacionActual).toBe(true);
      expect(respuesta.paradas[0]).toMatchObject({
        local: { id: 10, nombre: 'Paseo la galería' },
        distanciaDesdeAnteriorMetros: 80,
        viajeDesdeAnteriorSegundos: 30,
      });
      expect(prisma.rutaDiariaRepositor.upsert).toHaveBeenCalledTimes(1);

      if (!guardada) throw new Error('La ruta no se guardó');
      prisma.rutaDiariaRepositor.findUnique.mockResolvedValue({
        firmaAgenda: guardada.firmaAgenda,
        datos: guardada.datos,
        updatedAt: new Date(),
      });
      osrm.tabla.mockClear();
      osrm.ruta.mockClear();

      const reutilizada = await service.rutaHoy(1, {
        latitud: -25.3,
        longitud: -57.7,
      });

      expect(reutilizada.generadaEn).toBe(respuesta.generadaEn);
      expect(osrm.tabla).not.toHaveBeenCalled();
      expect(osrm.ruta).not.toHaveBeenCalled();

      await service.rutaHoy(1, {
        latitud: -25.3,
        longitud: -57.7,
        recalcular: 'true',
      });

      expect(osrm.tabla).toHaveBeenCalledTimes(1);
      expect(osrm.ruta).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
