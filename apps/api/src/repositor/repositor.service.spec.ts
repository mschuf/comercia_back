import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { OsrmService } from './osrm.service';
import { RepositorService } from './repositor.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('RepositorService', () => {
  const prisma = {
    local: { findMany: jest.fn() },
    visita: { findMany: jest.fn() },
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
});
