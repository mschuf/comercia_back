import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AccesoPlataformaService } from './acceso-plataforma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AccesoPlataformaService', () => {
  const prisma = {
    usuario: { findUnique: jest.fn() },
    empresaModulo: { findMany: jest.fn() },
    empresaPagina: { findMany: jest.fn() },
  };
  const service = new AccesoPlataformaService(
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usuario.findUnique.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 5,
      isActive: true,
    });
    prisma.empresaPagina.findMany.mockResolvedValue([]);
  });

  it('autoriza una página completa del módulo Team Leader', async () => {
    prisma.empresaModulo.findMany.mockResolvedValue([
      {
        todasLasPaginas: true,
        rolIds: [5],
        modulo: { paginas: [{ id: 100 }] },
      },
    ]);

    await expect(
      service.exigirAccesoAlgunaPaginaEnModulos(
        10,
        ['team-leader', 'repositor'],
        ['mapa'],
      ),
    ).resolves.toEqual({ id: 10, empresaId: 20, rolId: 5 });
  });

  it('autoriza una página específica del módulo Repositor', async () => {
    prisma.empresaModulo.findMany.mockResolvedValue([
      {
        todasLasPaginas: false,
        rolIds: [5],
        modulo: { paginas: [{ id: 200 }] },
      },
    ]);
    prisma.empresaPagina.findMany.mockResolvedValue([
      { paginaId: 200, rolIds: [5] },
    ]);

    await expect(
      service.exigirAccesoAlgunaPaginaEnModulos(
        10,
        ['team-leader', 'repositor'],
        ['clientes'],
      ),
    ).resolves.toEqual({ id: 10, empresaId: 20, rolId: 5 });
  });

  it('rechaza cuando el rol no puede ver el módulo', async () => {
    prisma.empresaModulo.findMany.mockResolvedValue([
      {
        todasLasPaginas: true,
        rolIds: [6],
        modulo: { paginas: [{ id: 200 }] },
      },
    ]);

    await expect(
      service.exigirAccesoAlgunaPaginaEnModulos(
        10,
        ['team-leader', 'repositor'],
        ['clientes'],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza usuarios inactivos antes de consultar asignaciones', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 5,
      isActive: false,
    });

    await expect(
      service.exigirAccesoAlgunaPaginaEnModulos(
        10,
        ['team-leader', 'repositor'],
        ['clientes'],
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.empresaModulo.findMany).not.toHaveBeenCalled();
  });
});
