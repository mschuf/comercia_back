import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { UbicacionesService } from './ubicaciones.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('UbicacionesService', () => {
  const prisma = {
    consentimientoUbicacion: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    usuario: { findUnique: jest.fn() },
    ubicacionUsuario: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new UbicacionesService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('guarda el correo y celular derivados del usuario autenticado', async () => {
    const registradaEn = new Date();
    prisma.usuario.findUnique.mockResolvedValue({
      correo: 'operador@comercia.test',
      celular: '+595981000000',
      consentimientoUbicacion: { revocadoEn: null },
    });
    prisma.ubicacionUsuario.create.mockResolvedValue({
      id: 7,
      latitud: -25.28,
      longitud: -57.64,
      precisionMetros: 8.5,
      registradaEn,
      recibidaEn: registradaEn,
    });

    await expect(
      service.registrar(12, {
        latitud: -25.28,
        longitud: -57.64,
        precisionMetros: 8.5,
        registradaEn: registradaEn.toISOString(),
      }),
    ).resolves.toMatchObject({ id: 7 });

    expect(prisma.ubicacionUsuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 12,
          correoUsuario: 'operador@comercia.test',
          celularUsuario: '+595981000000',
        }),
      }),
    );
  });

  it('no acepta posiciones cuando el consentimiento no está activo', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      correo: 'operador@comercia.test',
      celular: '+595981000000',
      consentimientoUbicacion: { revocadoEn: new Date() },
    });

    await expect(
      service.registrar(12, {
        latitud: -25.28,
        longitud: -57.64,
        registradaEn: new Date().toISOString(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.ubicacionUsuario.create).not.toHaveBeenCalled();
  });

  it('revoca el consentimiento sin crear una posición', async () => {
    await expect(
      service.actualizarConsentimiento(12, {
        aceptado: false,
        versionPolitica: '1.0',
      }),
    ).resolves.toEqual({
      activo: false,
      otorgadoEn: null,
      versionPolitica: null,
    });

    expect(prisma.consentimientoUbicacion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuarioId: 12, revocadoEn: null },
      }),
    );
  });
});
