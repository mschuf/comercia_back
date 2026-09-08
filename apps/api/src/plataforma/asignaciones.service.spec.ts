import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AsignacionesService } from './asignaciones.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('AsignacionesService - roles por empresa', () => {
  it.each([
    { empresaId: 20, moduloId: 1, rolIds: [8] },
    {
      empresaId: 20,
      moduloId: 1,
      todasLasPaginas: false,
      paginas: [{ paginaId: 2, rolIds: [8] }],
    },
  ])('rechaza roles ajenos en módulos y páginas', async (dto) => {
    const prisma = {
      empresa: { findUnique: jest.fn().mockResolvedValue({ id: 20 }) },
      modulo: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      rol: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(),
    };
    const service = new AsignacionesService(prisma as unknown as PrismaService);
    await expect(service.asignarModulo(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.rol.count).toHaveBeenCalledWith({
      where: { id: { in: [8] }, empresaId: 20 },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
