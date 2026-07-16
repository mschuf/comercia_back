import { ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import { AgrupacionKpiVisitaDto } from './dto/kpis-visitas.dto';
import { KpisVisitasService } from './kpis-visitas.service';

jest.mock('../../generated/prisma/client', () => ({
  Prisma: { sql: jest.fn((...partes: unknown[]) => partes) },
}));

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('KpisVisitasService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
    visita: { count: jest.fn() },
  };
  const acceso = { usuario: jest.fn() };
  const service = new KpisVisitasService(
    prisma as unknown as PrismaService,
    acceso as unknown as AccesoOperacionesCampoService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    acceso.usuario.mockResolvedValue({
      id: 1,
      empresaId: 2,
      rolId: 5,
      esGestor: true,
      esOperativo: false,
    });
  });

  it('calcula el resumen con visitas terminadas y en curso', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        visitas_completadas: 8,
        usuarios_activos: 3,
        locales_visitados: 5,
        duracion_promedio_minutos: 31.26,
        duracion_mediana_minutos: 28,
        tiempo_total_minutos: 250.04,
        cumplimiento_porcentaje: 96.67,
      },
    ]);
    prisma.visita.count.mockResolvedValue(2);

    await expect(
      service.resumen(1, { desde: '2026-07-01', hasta: '2026-07-16' }),
    ).resolves.toMatchObject({
      visitasCompletadas: 8,
      visitasEnCurso: 2,
      usuariosActivos: 3,
      localesVisitados: 5,
      duracionPromedioMinutos: 31.3,
      cumplimientoPorcentaje: 96.7,
    });
  });

  it('pagina el desglose por usuario', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        entidad_id: 7,
        nombre: 'Ana Rojas',
        detalle: null,
        visitas: 4,
        duracion_promedio_minutos: 22.24,
        cumplimiento_porcentaje: 100,
        entidades_relacionadas: 3,
        total_grupos: 9,
      },
    ]);

    await expect(
      service.detalle(1, {
        agrupadoPor: AgrupacionKpiVisitaDto.USUARIO,
        desde: '2026-07-01',
        hasta: '2026-07-16',
        page: 2,
        limit: 7,
      }),
    ).resolves.toMatchObject({
      total: 9,
      page: 2,
      limit: 7,
      items: [
        {
          entidadId: 7,
          nombre: 'Ana Rojas',
          duracionPromedioMinutos: 22.2,
        },
      ],
    });
  });

  it('rechaza indicadores para un repositor', async () => {
    acceso.usuario.mockResolvedValue({
      id: 1,
      empresaId: 2,
      rolId: 6,
      esGestor: false,
      esOperativo: true,
    });

    await expect(service.resumen(1, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
