import { ROL_TEAMLEADER_IMPULSADOR } from '../common/constants/roles-negocio';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import { TareasLocalService } from './tareas-local.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('TareasLocalService - alcance canónico al crear', () => {
  const tareaCreada = {
    id: 70,
    titulo: 'Controlar exhibición',
    descripcion: 'Revisar la góndola.',
    requiereFoto: false,
    orden: 1,
    activo: true,
  };
  const prisma = {
    local: { findFirst: jest.fn() },
    tarea: {
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn<(argumento: unknown) => Promise<typeof tareaCreada>>(),
    },
  };
  const acceso = {
    usuario: jest.fn(),
    filtroRepositoresDelSupervisor: jest.fn(),
  };
  let argumentoCreacion: unknown;
  const service = new TareasLocalService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoOperacionesCampoService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.local.findFirst.mockResolvedValue({
      id: 30,
      clienteId: 40,
      usuarioId: 24,
    });
    prisma.tarea.count.mockResolvedValue(0);
    prisma.tarea.aggregate.mockResolvedValue({ _max: { orden: 0 } });
    prisma.tarea.create.mockImplementation((argumento) => {
      argumentoCreacion = argumento;
      return Promise.resolve(tareaCreada);
    });
    acceso.filtroRepositoresDelSupervisor.mockResolvedValue({
      empresaId: 4,
      superiorId: 11,
    });
  });

  it('limita al equipo completo del team leader', async () => {
    acceso.usuario.mockResolvedValue({
      id: 11,
      empresaId: 4,
      rolDescripcion: ROL_TEAMLEADER_IMPULSADOR,
      esGestor: true,
      esOperativo: false,
    });

    await service.crear(11, 30, {
      titulo: tareaCreada.titulo,
      descripcion: tareaCreada.descripcion,
    });

    const llamada = argumentoCreacion as {
      data: Record<string, unknown>;
    };
    expect(llamada.data).toMatchObject({
      alcanceUsuarios: 'EQUIPO_COMPLETO',
      equipoRaizId: 11,
      alcanceLocales: 'SELECCIONADOS',
      locales: { create: { localId: 30 } },
    });
  });

  it('mantiene el alcance de empresa para los gestores de reposición', async () => {
    acceso.usuario.mockResolvedValue({
      id: 15,
      empresaId: 4,
      rolDescripcion: 'teamleader',
      esGestor: true,
      esOperativo: false,
    });

    await service.crear(15, 30, {
      titulo: tareaCreada.titulo,
      descripcion: tareaCreada.descripcion,
    });

    const llamada = argumentoCreacion as {
      data: Record<string, unknown>;
    };
    expect(llamada.data).toMatchObject({
      alcanceUsuarios: 'EMPRESA',
      equipoRaizId: null,
    });
  });
});
