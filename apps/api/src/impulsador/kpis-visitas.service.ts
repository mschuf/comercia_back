import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { redondear1Decimal } from '../common/utils/numeros';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import {
  AgrupacionKpiVisitaDto,
  type FiltroKpisVisitasDto,
  type ListarKpisVisitasDto,
} from './dto/kpis-visitas.dto';
import { PAGINA_VISITAS } from './impulsador.constants';
import type {
  KpiVisitasDetalleDto,
  KpiVisitasDetalleFila,
  KpiVisitasResumenDto,
  KpiVisitasResumenFila,
} from './interfaces/kpis-visitas.interface';
import { fechaEnZonaIso } from './utils/programacion-visita';

const ZONA_HORARIA_KPIS = 'America/Asuncion';
const DIAS_RANGO_DEFECTO = 30;
const DIAS_RANGO_MAXIMO = 366;

@Injectable()
export class KpisVisitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  private async empresaTeamLeader(usuarioId: number): Promise<number> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [PAGINA_VISITAS]);
    if (!usuario.esGestor) {
      throw new ForbiddenException(
        'Solo un Team Leader puede ver los indicadores',
      );
    }
    return usuario.empresaId;
  }

  private rangoFechas(query: FiltroKpisVisitasDto): {
    desde: string;
    hasta: string;
  } {
    const ahora = new Date();
    const hasta = query.hasta ?? fechaEnZonaIso(ahora, ZONA_HORARIA_KPIS);
    const desde =
      query.desde ??
      fechaEnZonaIso(
        new Date(ahora.getTime() - (DIAS_RANGO_DEFECTO - 1) * 86_400_000),
        ZONA_HORARIA_KPIS,
      );
    const desdeFecha = new Date(`${desde}T00:00:00.000Z`);
    const hastaFecha = new Date(`${hasta}T00:00:00.000Z`);
    if (
      Number.isNaN(desdeFecha.getTime()) ||
      Number.isNaN(hastaFecha.getTime()) ||
      desdeFecha.toISOString().slice(0, 10) !== desde ||
      hastaFecha.toISOString().slice(0, 10) !== hasta ||
      desdeFecha > hastaFecha
    ) {
      throw new BadRequestException('El rango de fechas no es válido');
    }
    const dias =
      Math.floor((hastaFecha.getTime() - desdeFecha.getTime()) / 86_400_000) +
      1;
    if (dias > DIAS_RANGO_MAXIMO) {
      throw new BadRequestException(
        `El rango máximo es de ${DIAS_RANGO_MAXIMO} días`,
      );
    }
    return { desde, hasta };
  }

  private baseSql(empresaId: number, desde: string, hasta: string) {
    return Prisma.sql`
      WITH base AS (
        SELECT
          v.id,
          v.usuario_id,
          v.local_id,
          EXTRACT(EPOCH FROM (v.completada_en - v.iniciada_en)) / 60.0 AS duracion_minutos,
          COUNT(vt.id)::int AS tareas_total,
          COUNT(vt.id) FILTER (WHERE vt.completada)::int AS tareas_completadas
        FROM "visitas" v
        INNER JOIN "locales" l ON l.id = v.local_id
        LEFT JOIN "visita_tareas" vt ON vt.visita_id = v.id
        WHERE l.empresa_id = ${empresaId}
          AND v.completada_en IS NOT NULL
          AND v.iniciada_en >= (
            ${desde}::date::timestamp AT TIME ZONE ${ZONA_HORARIA_KPIS}
          )
          AND v.iniciada_en < (
            (${hasta}::date + INTERVAL '1 day')::timestamp
            AT TIME ZONE ${ZONA_HORARIA_KPIS}
          )
        GROUP BY v.id
      )
    `;
  }

  async resumen(
    usuarioId: number,
    query: FiltroKpisVisitasDto,
  ): Promise<KpiVisitasResumenDto> {
    const empresaId = await this.empresaTeamLeader(usuarioId);
    const { desde, hasta } = this.rangoFechas(query);
    const base = this.baseSql(empresaId, desde, hasta);
    const [filas, visitasEnCurso] = await Promise.all([
      this.prisma.$queryRaw<KpiVisitasResumenFila[]>(Prisma.sql`
        ${base}
        SELECT
          COUNT(*)::int AS visitas_completadas,
          COUNT(DISTINCT usuario_id)::int AS usuarios_activos,
          COUNT(DISTINCT local_id)::int AS locales_visitados,
          COALESCE(AVG(duracion_minutos), 0)::float8 AS duracion_promedio_minutos,
          COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duracion_minutos), 0)::float8 AS duracion_mediana_minutos,
          COALESCE(SUM(duracion_minutos), 0)::float8 AS tiempo_total_minutos,
          COALESCE(
            100.0 * SUM(tareas_completadas) / NULLIF(SUM(tareas_total), 0),
            0
          )::float8 AS cumplimiento_porcentaje
        FROM base
      `),
      this.prisma.visita.count({
        where: { local: { empresaId }, completadaEn: null },
      }),
    ]);
    const fila = filas[0];
    return {
      desde,
      hasta,
      visitasCompletadas: fila?.visitas_completadas ?? 0,
      visitasEnCurso,
      usuariosActivos: fila?.usuarios_activos ?? 0,
      localesVisitados: fila?.locales_visitados ?? 0,
      duracionPromedioMinutos: redondear1Decimal(
        fila?.duracion_promedio_minutos ?? 0,
      ),
      duracionMedianaMinutos: redondear1Decimal(
        fila?.duracion_mediana_minutos ?? 0,
      ),
      tiempoTotalMinutos: redondear1Decimal(fila?.tiempo_total_minutos ?? 0),
      cumplimientoPorcentaje: redondear1Decimal(
        fila?.cumplimiento_porcentaje ?? 0,
      ),
    };
  }

  async detalle(
    usuarioId: number,
    query: ListarKpisVisitasDto,
  ): Promise<RespuestaPaginada<KpiVisitasDetalleDto>> {
    const empresaId = await this.empresaTeamLeader(usuarioId);
    const { desde, hasta } = this.rangoFechas(query);
    const { skip, take, page, limit } = rangoPaginacion(query);
    const base = this.baseSql(empresaId, desde, hasta);
    const filas =
      query.agrupadoPor === AgrupacionKpiVisitaDto.USUARIO
        ? await this.prisma.$queryRaw<KpiVisitasDetalleFila[]>(Prisma.sql`
            ${base}
            SELECT
              b.usuario_id AS entidad_id,
              CONCAT_WS(' ', u.nombre, u.apellido) AS nombre,
              NULL::text AS detalle,
              COUNT(*)::int AS visitas,
              COALESCE(AVG(b.duracion_minutos), 0)::float8 AS duracion_promedio_minutos,
              COALESCE(
                100.0 * SUM(b.tareas_completadas) / NULLIF(SUM(b.tareas_total), 0),
                0
              )::float8 AS cumplimiento_porcentaje,
              COUNT(DISTINCT b.local_id)::int AS entidades_relacionadas,
              COUNT(*) OVER()::int AS total_grupos
            FROM base b
            INNER JOIN "usuarios" u ON u.id = b.usuario_id
            GROUP BY b.usuario_id, u.nombre, u.apellido
            ORDER BY visitas DESC, nombre ASC, b.usuario_id ASC
            LIMIT ${take} OFFSET ${skip}
          `)
        : await this.prisma.$queryRaw<KpiVisitasDetalleFila[]>(Prisma.sql`
            ${base}
            SELECT
              b.local_id AS entidad_id,
              l.nombre,
              c.nombre AS detalle,
              COUNT(*)::int AS visitas,
              COALESCE(AVG(b.duracion_minutos), 0)::float8 AS duracion_promedio_minutos,
              COALESCE(
                100.0 * SUM(b.tareas_completadas) / NULLIF(SUM(b.tareas_total), 0),
                0
              )::float8 AS cumplimiento_porcentaje,
              COUNT(DISTINCT b.usuario_id)::int AS entidades_relacionadas,
              COUNT(*) OVER()::int AS total_grupos
            FROM base b
            INNER JOIN "locales" l ON l.id = b.local_id
            INNER JOIN "clientes" c ON c.id = l.cliente_id
            GROUP BY b.local_id, l.nombre, c.nombre
            ORDER BY visitas DESC, l.nombre ASC, b.local_id ASC
            LIMIT ${take} OFFSET ${skip}
          `);
    const items = filas.map((fila) => ({
      agrupadoPor: query.agrupadoPor,
      entidadId: fila.entidad_id,
      nombre: fila.nombre,
      detalle: fila.detalle,
      visitas: fila.visitas,
      duracionPromedioMinutos: redondear1Decimal(
        fila.duracion_promedio_minutos,
      ),
      cumplimientoPorcentaje: redondear1Decimal(fila.cumplimiento_porcentaje),
      entidadesRelacionadas: fila.entidades_relacionadas,
    }));
    return respuestaPaginada(items, filas[0]?.total_grupos ?? 0, page, limit);
  }
}
