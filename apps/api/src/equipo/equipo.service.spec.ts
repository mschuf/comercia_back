import { NotFoundException } from '@nestjs/common';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EstadoTareaEquipoDto } from './dto/equipo.dto';
import { EquipoService } from './equipo.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('EquipoService', () => {
  const prisma = {
    usuario: { count: jest.fn(), findMany: jest.fn() },
    local: { findFirst: jest.fn() },
    visita: { findFirst: jest.fn() },
    visitaTarea: { count: jest.fn(), findMany: jest.fn() },
    tareaCliente: { count: jest.fn(), findMany: jest.fn() },
  };
  const alcance = {
    empresaId: 20,
    isActive: true,
    esSuperadmin: false,
    superiorId: 10,
    rolId: { in: [6] },
  };
  const acceso = {
    usuarioTeamLeader: jest.fn(),
    filtroRepositoresDelTeamLeader: jest.fn(),
  };
  const service = new EquipoService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoOperacionesCampoService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    acceso.usuarioTeamLeader.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolId: 5,
      esGestor: true,
      esOperativo: false,
    });
    acceso.filtroRepositoresDelTeamLeader.mockResolvedValue(alcance);
  });

  it('pagina y busca repositores por términos dentro del alcance', async () => {
    prisma.usuario.count.mockResolvedValue(1);
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 11,
        nombre: 'Ana',
        apellido: 'Rojas',
        nombreLogin: 'arojas',
        correo: 'ana@empresa.test',
        celular: '0981000000',
        _count: { localesAsignados: 2 },
        visitas: [],
      },
    ]);

    const respuesta = await service.repositores(10, {
      buscar: 'Ana Rojas',
      page: 2,
      limit: 7,
    });

    expect(acceso.usuarioTeamLeader).toHaveBeenCalledWith(10, 'equipo');
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
    if (!llamada) throw new Error('Falta la consulta de repositores');
    expect(llamada.where.AND[0]).toEqual(alcance);
    expect(llamada.where.AND[1]?.OR).toHaveLength(4);
    expect(llamada.where.AND[2]?.OR).toHaveLength(4);
    expect(llamada).toMatchObject({ skip: 7, take: 7 });
    expect(respuesta).toMatchObject({
      total: 1,
      page: 2,
      limit: 7,
      items: [{ id: 11, nombreCompleto: 'Ana Rojas', localesCount: 2 }],
    });
  });

  it('rechaza con 404 un local de otro líder o empresa', async () => {
    prisma.local.findFirst.mockResolvedValue(null);

    await expect(
      service.tareas(10, { localId: 99, repositorId: 40 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(acceso.usuarioTeamLeader).toHaveBeenCalledWith(10, 'tareas');
    const llamadas = prisma.local.findFirst.mock.calls as unknown as Array<
      [{ where: Record<string, unknown> }]
    >;
    const llamada = llamadas[0]?.[0];
    if (!llamada) throw new Error('Falta la consulta del local');
    expect(llamada.where).toMatchObject({
      id: 99,
      empresaId: 20,
      usuario: { is: { AND: [alcance, { id: 40 }] } },
    });
    expect(prisma.tareaCliente.findMany).not.toHaveBeenCalled();
  });

  it('devuelve checklist pendiente y resumen aunque aún no exista visita', async () => {
    prisma.local.findFirst.mockResolvedValue({
      id: 30,
      nombre: 'Centro',
      cliente: { id: 50, nombre: 'Cliente' },
      usuario: { id: 11, nombre: 'Ana', apellido: 'Rojas' },
    });
    prisma.visita.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.tareaCliente.count.mockResolvedValue(2);
    prisma.tareaCliente.findMany.mockResolvedValue([
      {
        id: 70,
        titulo: 'Reponer',
        descripcion: 'Completar góndola',
        requiereFoto: false,
        orden: 1,
      },
      {
        id: 71,
        titulo: 'Precio',
        descripcion: 'Verificar etiqueta',
        requiereFoto: true,
        orden: 2,
      },
    ]);

    const respuesta = await service.tareas(10, {
      localId: 30,
      estado: EstadoTareaEquipoDto.PENDIENTE,
    });

    expect(respuesta.resumen).toEqual({
      total: 2,
      pendientes: 2,
      completadas: 0,
    });
    expect(respuesta.items).toHaveLength(2);
    expect(respuesta.items[0]).toMatchObject({
      tareaId: 70,
      visitaTareaId: null,
      estado: 'PENDIENTE',
      repositor: { id: 11, nombre: 'Ana Rojas' },
    });
  });

  it('calcula el resumen general antes de aplicar estado y paginación', async () => {
    prisma.visitaTarea.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
    prisma.visitaTarea.findMany.mockResolvedValue([]);

    const respuesta = await service.tareas(10, {
      repositorId: 11,
      estado: EstadoTareaEquipoDto.PENDIENTE,
      page: 1,
      limit: 7,
    });

    expect(respuesta.total).toBe(2);
    expect(respuesta.resumen).toEqual({
      total: 5,
      pendientes: 2,
      completadas: 3,
    });
    const llamadas = prisma.visitaTarea.findMany.mock.calls as unknown as Array<
      [
        {
          where: Record<string, unknown>;
          skip: number;
          take: number;
        },
      ]
    >;
    const llamada = llamadas[0]?.[0];
    if (!llamada) throw new Error('Falta la consulta de tareas');
    expect(llamada.where).toMatchObject({ completada: false });
    expect(llamada).toMatchObject({ skip: 0, take: 7 });
  });
});
