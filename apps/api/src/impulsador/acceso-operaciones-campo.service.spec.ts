import { NotFoundException } from '@nestjs/common';
import type { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AccesoOperacionesCampoService', () => {
  const prisma = {
    usuario: { findMany: jest.fn() },
    empresaModulo: { findFirst: jest.fn() },
    empresaPagina: { findMany: jest.fn() },
  };
  const acceso = {
    exigirAccesosPaginasEnModulos: jest.fn(),
    exigirAccesoPagina: jest.fn(),
    exigirAccesoAlgunaPagina: jest.fn(),
  };
  const service = new AccesoOperacionesCampoService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoPlataformaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deriva Team Leader y Repositor de los módulos realmente autorizados', async () => {
    acceso.exigirAccesosPaginasEnModulos.mockResolvedValue({
      usuario: { id: 10, empresaId: 20, rolId: 5 },
      modulosRutas: ['team-leader', 'repositor'],
    });

    await expect(service.usuario(10, ['clientes'])).resolves.toEqual({
      id: 10,
      empresaId: 20,
      rolId: 5,
      esGestor: true,
      esOperativo: true,
    });
  });

  it('exige el módulo Repositor para sus endpoints dedicados', async () => {
    acceso.exigirAccesoPagina.mockResolvedValue({
      id: 11,
      empresaId: 20,
      rolId: 6,
    });

    await expect(service.usuarioRepositor(11, 'visitas')).resolves.toEqual({
      id: 11,
      empresaId: 20,
      rolId: 6,
      esGestor: false,
      esOperativo: true,
    });
    expect(acceso.exigirAccesoPagina).toHaveBeenCalledWith(
      11,
      'repositor',
      'visitas',
    );
  });

  it('solo lista usuarios habilitados para las páginas de Repositor', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 11,
        nombre: 'Ana',
        apellido: 'Rojas',
        nombreLogin: 'ana',
        rolId: 6,
        rol: { descripcion: 'REPOSITOR' },
      },
      {
        id: 12,
        nombre: 'Luis',
        apellido: 'Vera',
        nombreLogin: 'luis',
        rolId: 5,
        rol: { descripcion: 'TEAM LEADER' },
      },
    ]);
    prisma.empresaModulo.findFirst.mockResolvedValue({
      todasLasPaginas: false,
      rolIds: [5, 6],
      modulo: { paginas: [{ id: 101 }, { id: 102 }] },
    });
    prisma.empresaPagina.findMany.mockResolvedValue([
      { paginaId: 101, rolIds: [6] },
      { paginaId: 102, rolIds: [6] },
    ]);

    await expect(service.repositoresAsignables(20)).resolves.toEqual([
      {
        id: 11,
        nombre: 'Ana Rojas',
        nombreLogin: 'ana',
        rol: 'REPOSITOR',
      },
    ]);
  });

  it('oculta responsables que no tengan acceso a Team Leader', async () => {
    acceso.exigirAccesoAlgunaPagina.mockRejectedValue(new Error('sin acceso'));

    await expect(
      service.validarResponsableTerritorio(20, 12),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
