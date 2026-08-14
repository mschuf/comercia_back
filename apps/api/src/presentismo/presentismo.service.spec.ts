import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('../impulsador/acceso-operaciones-campo.service', () => ({
  AccesoOperacionesCampoService: class AccesoOperacionesCampoService {},
}));

import { PresentismoService } from './presentismo.service';

describe('PresentismoService - jornada', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    local: { findMany: jest.fn() },
    visita: { findMany: jest.fn() },
  };
  const accesoCampo = {
    usuarioSupervisor: jest.fn(),
    filtroEquipoVisible: jest.fn(),
  };
  const service = new PresentismoService(
    prisma as unknown as PrismaService,
    accesoCampo as unknown as AccesoOperacionesCampoService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    accesoCampo.usuarioSupervisor.mockResolvedValue({
      id: 10,
      empresaId: 20,
      rolDescripcion: 'teamleader.impulsador',
      esGestor: true,
      esOperativo: false,
    });
    accesoCampo.filtroEquipoVisible.mockReturnValue({ superiorId: 10 });
  });

  it('devuelve solo el detalle diario de una persona del equipo', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 11 });
    prisma.local.findMany.mockResolvedValue([
      {
        id: 30,
        nombre: 'Local Centro',
        fechaVisita: new Date('2026-08-17T12:00:00.000Z'),
        programacionVisita: null,
        cliente: { nombre: 'Cliente SA' },
      },
    ]);
    prisma.visita.findMany.mockResolvedValue([
      {
        id: 40,
        localId: 30,
        iniciadaEn: new Date('2026-08-17T12:05:00.000Z'),
        completadaEn: new Date('2026-08-17T12:30:00.000Z'),
        local: {
          id: 30,
          nombre: 'Local Centro',
          cliente: { nombre: 'Cliente SA' },
        },
      },
    ]);

    const resultado = await service.jornada(10, 11, {
      fecha: '2026-08-17',
      page: 1,
      limit: 7,
    });

    expect(accesoCampo.filtroEquipoVisible).toHaveBeenCalledWith(
      expect.objectContaining({ id: 10 }),
    );
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ superiorId: 10 }, { id: 11 }] },
      }),
    );
    expect(resultado).toEqual(
      expect.objectContaining({
        total: 1,
        items: [
          expect.objectContaining({
            local: { id: 30, nombre: 'Local Centro', clienteNombre: 'Cliente SA' },
            estado: 'COMPLETADA',
          }),
        ],
      }),
    );
  });

  it('no consulta locales ni visitas fuera del equipo visible', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(
      service.jornada(10, 99, { fecha: '2026-08-17', page: 1, limit: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.local.findMany).not.toHaveBeenCalled();
    expect(prisma.visita.findMany).not.toHaveBeenCalled();
  });
});
