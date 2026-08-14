import { NotFoundException } from '@nestjs/common';
import { ROL_TEAMLEADER_IMPULSADOR } from '../common/constants/roles-negocio';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import { TareasService } from './tareas.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../../generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError {},
    sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    })),
  },
}));

describe('TareasService.quitarTodasDeUsuario', () => {
  const gestor = {
    id: 11,
    empresaId: 4,
    rolId: 7,
    rolDescripcion: ROL_TEAMLEADER_IMPULSADOR,
    esGestor: true,
    esOperativo: false,
  };

  function escenario() {
    const tx = {
      tareaGlobal: {
        findMany: jest.fn().mockResolvedValue([{ id: 3 }, { id: 8 }]),
      },
      tareaGlobalUsuario: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      tareaGlobalExclusionUsuario: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $executeRaw: jest.fn().mockResolvedValue(2),
    };
    const prisma = {
      usuario: {
        findFirst: jest.fn().mockResolvedValue({
          id: 24,
          rol: { descripcion: 'repositor' },
        }),
      },
      $transaction: jest.fn(
        async (operacion: (cliente: typeof tx) => Promise<number>) =>
          operacion(tx),
      ),
    };
    const acceso = {
      usuario: jest.fn().mockResolvedValue(gestor),
      validarOperativosDelGestor: jest.fn().mockResolvedValue([24]),
    };
    return {
      acceso,
      prisma,
      service: new TareasService(
        prisma as unknown as PrismaService,
        acceso as unknown as AccesoOperacionesCampoService,
      ),
      tx,
    };
  }

  it('excluye solo al destinatario y conserva las tareas compartidas', async () => {
    const { acceso, service, tx } = escenario();

    await expect(service.quitarTodasDeUsuario(11, 24)).resolves.toEqual({
      ok: true,
      usuarioId: 24,
      tareasQuitadas: 4,
    });

    expect(acceso.validarOperativosDelGestor).toHaveBeenCalledWith(
      gestor,
      [24],
    );
    expect(tx.tareaGlobalUsuario.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: 24, tareaGlobalId: { in: [3, 8] } },
    });
    expect(tx.tareaGlobalExclusionUsuario.createMany).toHaveBeenCalledWith({
      data: [
        { tareaGlobalId: 3, usuarioId: 24, excluidoPorId: 11 },
        { tareaGlobalId: 8, usuarioId: 24, excluidoPorId: 11 },
      ],
      skipDuplicates: true,
    });
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('también quita tareas locales cuando no hay tareas globales', async () => {
    const { service, tx } = escenario();
    tx.tareaGlobal.findMany.mockResolvedValue([]);

    await expect(service.quitarTodasDeUsuario(11, 24)).resolves.toEqual({
      ok: true,
      usuarioId: 24,
      tareasQuitadas: 2,
    });
    expect(tx.tareaGlobalUsuario.deleteMany).not.toHaveBeenCalled();
    expect(tx.tareaGlobalExclusionUsuario.createMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it('rechaza usuarios que no pertenecen al equipo del gestor', async () => {
    const { acceso, prisma, service } = escenario();
    acceso.validarOperativosDelGestor.mockRejectedValue(
      new NotFoundException('El usuario no pertenece a tu equipo'),
    );

    await expect(service.quitarTodasDeUsuario(11, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
