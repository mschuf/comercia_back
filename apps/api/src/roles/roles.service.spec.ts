import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { RolesService } from './roles.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('RolesService', () => {
  const prisma = {
    rol: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new RolesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pagina los roles y expone sólo el DTO administrativo', async () => {
    prisma.rol.count.mockResolvedValue(8);
    prisma.rol.findMany.mockResolvedValue([
      {
        id: 3,
        descripcion: 'Supervisor',
        padre: { id: 1, descripcion: 'Gerencia' },
        _count: { usuarios: 4, hijos: 1 },
      },
    ]);

    await expect(service.listar({ page: 2, limit: 7 })).resolves.toEqual({
      items: [
        {
          id: 3,
          descripcion: 'Supervisor',
          padre: { id: 1, descripcion: 'Gerencia' },
          usuariosCount: 4,
          hijosCount: 1,
        },
      ],
      total: 8,
      page: 2,
      limit: 7,
      totalPages: 2,
    });
    expect(prisma.rol.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 7, take: 7 }),
    );
  });

  it('rechaza eliminar un rol con usuarios o subordinados', async () => {
    prisma.rol.findUnique.mockResolvedValue({
      id: 3,
      _count: { usuarios: 1, hijos: 0 },
    });

    await expect(service.eliminar(3)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rol.delete).not.toHaveBeenCalled();
  });

  it('rechaza asignar el propio rol como superior', async () => {
    prisma.rol.findUnique.mockResolvedValue({ id: 3 });

    await expect(service.actualizar(3, { rolId: 3 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rol.update).not.toHaveBeenCalled();
  });
});
