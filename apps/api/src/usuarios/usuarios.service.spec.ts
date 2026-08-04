import { ForbiddenException } from '@nestjs/common';
import type { AuthService } from '../auth/auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from './usuarios.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../auth/auth.service', () => ({
  AuthService: class AuthService {},
}));

describe('UsuariosService - permiso de superadmin', () => {
  const prisma = {
    usuario: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    rol: { findUnique: jest.fn() },
  };
  const auth = { crearUsuario: jest.fn() };
  const service = new UsuariosService(
    prisma as unknown as PrismaService,
    auth as unknown as AuthService,
  );
  const dto = {
    nombre: 'Ana',
    apellido: 'Rojas',
    correo: 'ana@example.com',
    nombreLogin: 'ana.rojas',
    empresaId: 20,
    ruc: '1234567-8',
    celularPais: 'PY',
    celular: '0981123456',
    password: 'secreto123',
    rolId: 6,
    superiorId: null,
    esSuperadmin: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite que un superadmin cree otra cuenta superadmin', async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 1,
        empresaId: 20,
        esSuperadmin: true,
        isActive: true,
        rol: null,
      })
      .mockResolvedValueOnce({
        id: 2,
        nombre: 'Ana',
        apellido: 'Rojas',
        correo: 'ana@example.com',
        nombreLogin: 'ana.rojas',
        ruc: '1234567-8',
        celular: '+595981123456',
        esSuperadmin: true,
        isActive: true,
        createdAt: new Date('2026-08-04T12:00:00.000Z'),
        empresa: { id: 20, nombre: 'Empresa' },
        rol: { id: 6, descripcion: 'SUPERVISOR' },
        superior: null,
      });
    prisma.rol.findUnique.mockResolvedValue({ id: 6 });
    auth.crearUsuario.mockResolvedValue({ id: 2 });

    await expect(service.crear(1, dto)).resolves.toMatchObject({
      id: 2,
      esSuperadmin: true,
    });
    expect(auth.crearUsuario).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 20 }),
      {
        rolId: 6,
        superiorId: null,
        esSuperadmin: true,
      },
    );
  });

  it('impide que un gerente eleve privilegios al crear usuarios', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 10,
      empresaId: 20,
      esSuperadmin: false,
      isActive: true,
      rol: { descripcion: 'GERENTE' },
    });

    await expect(service.crear(10, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(auth.crearUsuario).not.toHaveBeenCalled();
  });

  it('muestra cuentas superadmin solamente en el listado de un superadmin', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      empresaId: 20,
      esSuperadmin: true,
      isActive: true,
      rol: null,
    });
    prisma.usuario.count.mockResolvedValue(0);
    prisma.usuario.findMany.mockResolvedValue([]);

    await service.listar(1, { empresaId: 20, page: 1, limit: 7 });

    expect(prisma.usuario.count).toHaveBeenCalledWith({
      where: { empresaId: 20 },
    });
  });
});
