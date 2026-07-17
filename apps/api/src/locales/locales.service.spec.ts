import { NotFoundException } from '@nestjs/common';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import { LocalesService } from './locales.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('LocalesService - alcance de Supervisor', () => {
  const prisma = {
    local: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    cliente: { findUnique: jest.fn() },
    zona: { findUnique: jest.fn() },
    zonaUsuario: { findUnique: jest.fn() },
  };
  const actual = {
    id: 10,
    empresaId: 20,
    rolId: 5,
    esGestor: true,
    esOperativo: false,
  };
  const alcance = {
    empresaId: 20,
    isActive: true,
    superiorId: 10,
    rolId: { in: [6] },
  };
  const acceso = {
    usuario: jest.fn(),
    usuarioSupervisorConAlgunaPagina: jest.fn(),
    filtroRepositoresDelSupervisor: jest.fn(),
  };
  const service = new LocalesService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoOperacionesCampoService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    acceso.usuario.mockResolvedValue(actual);
    acceso.usuarioSupervisorConAlgunaPagina.mockResolvedValue(actual);
    acceso.filtroRepositoresDelSupervisor.mockResolvedValue(alcance);
  });

  it('filtra usuarioId y nombre completo sin salir del equipo', async () => {
    prisma.local.count.mockResolvedValue(0);
    prisma.local.findMany.mockResolvedValue([]);

    await service.listar(10, {
      usuarioId: 11,
      repositor: 'Ana Rojas',
      page: 2,
      limit: 7,
    });

    const llamadas = prisma.local.findMany.mock.calls as unknown as Array<
      [
        {
          where: {
            empresaId: number;
            usuario: { is: { AND: { OR?: unknown[] }[] } };
          };
          skip: number;
          take: number;
        },
      ]
    >;
    const llamada = llamadas[0]?.[0];
    if (!llamada) throw new Error('Falta la consulta de locales');
    expect(llamada.where.empresaId).toBe(20);
    expect(llamada.where.usuario.is.AND[0]).toEqual(alcance);
    expect(llamada.where.usuario.is.AND[1]).toEqual({ id: 11 });
    expect(llamada.where.usuario.is.AND[2]?.OR).toHaveLength(4);
    expect(llamada.where.usuario.is.AND[3]?.OR).toHaveLength(4);
    expect(llamada).toMatchObject({ skip: 7, take: 7 });
  });

  it('pagina solamente repositores asignables del líder', async () => {
    prisma.usuario.count.mockResolvedValue(1);
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 11,
        nombre: 'Ana',
        apellido: 'Rojas',
        nombreLogin: 'arojas',
        rol: { descripcion: 'REPOSITOR' },
      },
    ]);

    const respuesta = await service.usuariosAsignables(10, {
      buscar: 'Ana Rojas',
      page: 1,
      limit: 7,
    });

    expect(acceso.usuarioSupervisorConAlgunaPagina).toHaveBeenCalledWith(10, [
      'clientes',
      'mapa',
    ]);

    const llamadas = prisma.usuario.findMany.mock.calls as unknown as Array<
      [
        {
          where: { AND: { OR?: unknown[] }[] };
          skip: number;
          take: number;
        },
      ]
    >;
    const llamada = llamadas[0]?.[0];
    if (!llamada) throw new Error('Falta la consulta de asignables');
    expect(llamada.where.AND[0]).toEqual(alcance);
    expect(llamada.where.AND[1]?.OR).toHaveLength(4);
    expect(llamada.where.AND[2]?.OR).toHaveLength(4);
    expect(llamada).toMatchObject({ skip: 0, take: 7 });
    expect(respuesta).toEqual({
      items: [
        {
          id: 11,
          nombre: 'Ana Rojas',
          nombreLogin: 'arojas',
          rol: 'REPOSITOR',
        },
      ],
      total: 1,
      page: 1,
      limit: 7,
      totalPages: 1,
    });
  });

  it('impide asignar por ID un repositor de otro líder o empresa', async () => {
    prisma.cliente.findUnique.mockResolvedValue({
      empresaId: 20,
      activo: true,
    });
    prisma.zona.findUnique.mockResolvedValue({ empresaId: 20 });
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.crear(10, {
        clienteId: 1,
        nombre: 'Local',
        latitud: -25.3,
        longitud: -57.6,
        zonaId: 2,
        usuarioId: 99,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { AND: [alcance, { id: 99 }] },
      select: { id: true },
    });
    expect(prisma.local.create).not.toHaveBeenCalled();
  });

  it('oculta por localId los locales de otro equipo con 404 neutro', async () => {
    prisma.local.findFirst.mockResolvedValue(null);

    await expect(service.detalle(10, 90)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.local.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 90,
          empresaId: 20,
          OR: [
            { usuario: { is: alcance } },
            { usuarioId: null, creadoPorId: 10 },
          ],
        },
      }),
    );
  });
});
