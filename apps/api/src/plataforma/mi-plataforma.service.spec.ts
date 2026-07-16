import type { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { MiPlataformaService } from './mi-plataforma.service';

describe('MiPlataformaService', () => {
  const prisma = {
    usuario: { findUnique: jest.fn() },
    empresaModulo: { findMany: jest.fn() },
    empresaPagina: { findMany: jest.fn() },
  };
  const service = new MiPlataformaService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.usuario.findUnique.mockResolvedValue({
      empresaId: 1,
      rolId: 6,
      isActive: true,
    });
    prisma.empresaPagina.findMany.mockResolvedValue([]);
  });

  it('no muestra módulos sin páginas habilitadas para el rol', async () => {
    prisma.empresaModulo.findMany.mockResolvedValue([
      {
        rolIds: [6],
        todasLasPaginas: false,
        modulo: {
          id: 8,
          nombre: 'Repositor',
          ruta: 'repositor',
          icono: null,
          paginas: [
            {
              id: 15,
              nombre: 'Mis clientes',
              ruta: 'clientes',
              icono: null,
            },
          ],
        },
      },
    ]);

    await expect(service.menu(2)).resolves.toEqual([]);
  });

  it('consulta únicamente módulos y páginas globalmente activos', async () => {
    prisma.empresaModulo.findMany.mockResolvedValue([]);

    await service.menu(2);

    expect(prisma.empresaModulo.findMany).toHaveBeenCalledWith({
      where: { empresaId: 1, modulo: { activo: true } },
      include: {
        modulo: {
          include: {
            paginas: {
              where: { activo: true },
              orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
            },
          },
        },
      },
      orderBy: { modulo: { orden: 'asc' } },
    });
  });
});
