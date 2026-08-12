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
    exigirAccesoAlgunaPaginaEnModulos: jest.fn(),
  };
  const service = new AccesoOperacionesCampoService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoPlataformaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deriva Supervisor y Repositor de los módulos realmente autorizados', async () => {
    acceso.exigirAccesosPaginasEnModulos.mockResolvedValue({
      usuario: { id: 10, empresaId: 20, rolId: 5 },
      modulosRutas: ['supervisor', 'repositor'],
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
    acceso.exigirAccesoAlgunaPaginaEnModulos.mockResolvedValue({
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
    expect(acceso.exigirAccesoAlgunaPaginaEnModulos).toHaveBeenCalledWith(
      11,
      ['impulsador', 'repositor'],
      ['visitas', 'entrada', 'marcaciones', 'rendimiento'],
    );
  });

  it('exige la página del Supervisor para sus endpoints dedicados', async () => {
    acceso.exigirAccesoAlgunaPaginaEnModulos.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 5,
    });

    await expect(service.usuarioSupervisor(10, 'equipo')).resolves.toEqual({
      id: 10,
      empresaId: 20,
      rolId: 5,
      esGestor: true,
      esOperativo: false,
    });
    expect(acceso.exigirAccesoAlgunaPaginaEnModulos).toHaveBeenCalledWith(
      10,
      ['supervisor-impulsador', 'teamleader-impulsador', 'supervisor'],
      ['equipo'],
    );
  });

  it('acepta alguna de las páginas habilitadas para un recurso compartido', async () => {
    acceso.exigirAccesoAlgunaPaginaEnModulos.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 5,
    });

    await expect(
      service.usuarioSupervisorConAlgunaPagina(10, ['clientes', 'mapa']),
    ).resolves.toMatchObject({ id: 10, empresaId: 20, esGestor: true });
    expect(acceso.exigirAccesoAlgunaPaginaEnModulos).toHaveBeenCalledWith(
      10,
      ['supervisor-impulsador', 'teamleader-impulsador', 'supervisor'],
      ['clientes', 'locales', 'mapa'],
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
        rol: { descripcion: 'SUPERVISOR' },
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

  it('oculta responsables que no tengan acceso a Supervisor', async () => {
    acceso.exigirAccesoAlgunaPaginaEnModulos.mockRejectedValue(
      new Error('sin acceso'),
    );

    await expect(
      service.validarResponsableTerritorio(20, 12),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('limita el alcance a subordinados directos sin excluir su permiso administrativo', async () => {
    prisma.empresaModulo.findFirst.mockResolvedValue({
      todasLasPaginas: true,
      rolIds: [6],
      modulo: { paginas: [{ id: 101 }] },
    });

    await expect(
      service.filtroRepositoresDelSupervisor({
        id: 10,
        empresaId: 20,
        rolId: 5,
        esGestor: true,
        esOperativo: false,
      }),
    ).resolves.toEqual({
      empresaId: 20,
      isActive: true,
      superiorId: 10,
      rolId: { in: [6] },
    });
  });

  it('acepta destinatarios de tareas solo cuando pertenecen al equipo directo', async () => {
    prisma.empresaModulo.findFirst.mockResolvedValue({
      todasLasPaginas: true,
      rolIds: [6],
      modulo: { paginas: [{ id: 101 }] },
    });
    prisma.usuario.findMany.mockResolvedValue([{ id: 11 }, { id: 12 }]);

    await expect(
      service.validarOperativosDelGestor(
        {
          id: 10,
          empresaId: 20,
          rolId: 5,
          esGestor: true,
          esOperativo: false,
        },
        [11, 12, 12],
      ),
    ).resolves.toEqual([11, 12]);
    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: {
        empresaId: 20,
        isActive: true,
        superiorId: 10,
        rolId: { in: [6] },
        id: { in: [11, 12] },
      },
      select: { id: true },
      take: 200,
    });
  });

  it('rechaza destinatarios ajenos al equipo sin revelar cual falta', async () => {
    prisma.empresaModulo.findFirst.mockResolvedValue({
      todasLasPaginas: true,
      rolIds: [6],
      modulo: { paginas: [{ id: 101 }] },
    });
    prisma.usuario.findMany.mockResolvedValue([{ id: 11 }]);

    await expect(
      service.validarOperativosDelGestor(
        {
          id: 10,
          empresaId: 20,
          rolId: 5,
          esGestor: true,
          esOperativo: false,
        },
        [11, 99],
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('da al supervisor de impulsadores alcance sobre team leaders y sus impulsadores', () => {
    expect(
      service.filtroEquipoVisible({
        id: 10,
        empresaId: 20,
        rolId: 15,
        rolDescripcion: 'supervisor.impulsador',
        esGestor: true,
        esOperativo: false,
      }),
    ).toMatchObject({
      empresaId: 20,
      isActive: true,
      OR: [{ superiorId: 10 }, { superior: { is: { superiorId: 10 } } }],
    });
  });

  it('limita al team leader a sus impulsadores directos', () => {
    expect(
      service.filtroEquipoVisible({
        id: 11,
        empresaId: 20,
        rolId: 11,
        rolDescripcion: 'teamleader.impulsador',
        esGestor: true,
        esOperativo: true,
      }),
    ).toMatchObject({
      empresaId: 20,
      isActive: true,
      superiorId: 11,
      rol: { is: { descripcion: { in: ['impulsador'] } } },
    });
  });
});
