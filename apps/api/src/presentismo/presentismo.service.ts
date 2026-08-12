import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { filtrosBusquedaUsuario } from '../common/utils/busqueda-usuario';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import { PAGINA_PRESENTISMO } from '../impulsador/impulsador.constants';
import type { UsuarioOperacionesCampo } from '../impulsador/interfaces/usuario-operaciones-campo.interface';
import {
  fechaEnZonaIso,
  ocurrenciasVisitaEnDia,
  rangoDiaIsoEnZona,
} from '../impulsador/utils/programacion-visita';
import { PrismaService } from '../prisma/prisma.service';
import {
  ListarPresentismoDto,
  ResumenPresentismoQueryDto,
} from './dto/presentismo.dto';
import type {
  FilaPresentismoDto,
  MetricaPresentismoDto,
  ResumenPresentismoDto,
} from './interfaces/presentismo.interface';
import {
  diasDelPeriodo,
  periodosPresentismo,
  type PeriodoPresentismo,
} from './utils/periodos-presentismo';

const ZONA_HORARIA = 'America/Asuncion';

type UsuarioFila = {
  id: number;
  nombre: string;
  apellido: string;
  rol: { descripcion: string } | null;
  superior: { id: number; nombre: string; apellido: string } | null;
  _count: { localesAsignados: number };
};

type Acumulado = { programadas: number; entradas: number; salidas: number };

function porcentaje(programadas: number, entradas: number): number {
  if (programadas === 0) return 0;
  return Math.round(Math.min(100, (entradas * 1000) / programadas)) / 10;
}

function nombreCompleto(persona: { nombre: string; apellido: string }): string {
  return `${persona.nombre} ${persona.apellido}`.trim();
}

@Injectable()
export class PresentismoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  private async gestor(usuarioId: number): Promise<UsuarioOperacionesCampo> {
    return this.accesoCampo.usuarioSupervisor(usuarioId, PAGINA_PRESENTISMO);
  }

  private rango(periodo: PeriodoPresentismo): {
    inicio: Date;
    fin: Date;
    dias: string[];
  } {
    try {
      const dias = diasDelPeriodo(periodo.desde, periodo.hasta);
      const inicio = rangoDiaIsoEnZona(periodo.desde, ZONA_HORARIA).inicio;
      const fin = rangoDiaIsoEnZona(periodo.hasta, ZONA_HORARIA).fin;
      return { inicio, fin, dias };
    } catch {
      throw new BadRequestException(
        'El rango debe ser válido y no superar 366 días',
      );
    }
  }

  private async calcular(
    usuarios: UsuarioFila[],
    periodo: PeriodoPresentismo,
  ): Promise<Map<number, Acumulado>> {
    const ids = usuarios.map(({ id }) => id);
    const acumulados = new Map<number, Acumulado>(
      ids.map((id) => [id, { programadas: 0, entradas: 0, salidas: 0 }]),
    );
    if (ids.length === 0) return acumulados;
    const { inicio, fin, dias } = this.rango(periodo);
    const [locales, visitas] = await Promise.all([
      this.prisma.local.findMany({
        where: { usuarioId: { in: ids }, activo: true },
        select: {
          id: true,
          usuarioId: true,
          fechaVisita: true,
          programacionVisita: true,
        },
        take: 2000,
      }),
      this.prisma.visita.findMany({
        where: { usuarioId: { in: ids }, iniciadaEn: { gte: inicio, lt: fin } },
        select: {
          usuarioId: true,
          localId: true,
          iniciadaEn: true,
          completadaEn: true,
        },
        orderBy: { iniciadaEn: 'asc' },
        take: 10000,
      }),
    ]);
    const ahora = new Date();
    for (const local of locales) {
      if (local.usuarioId === null) continue;
      let programadas = 0;
      for (const dia of dias) {
        const referencia = new Date(`${dia}T12:00:00.000Z`);
        const ocurrencias = local.programacionVisita
          ? ocurrenciasVisitaEnDia(local.programacionVisita, referencia)
          : local.fechaVisita &&
              local.fechaVisita >= inicio &&
              local.fechaVisita < fin &&
              fechaEnZonaIso(local.fechaVisita, ZONA_HORARIA) === dia
            ? [local.fechaVisita]
            : [];
        programadas += ocurrencias.filter((fecha) => fecha <= ahora).length;
      }
      const delLocal = visitas.filter(
        (visita) =>
          visita.usuarioId === local.usuarioId && visita.localId === local.id,
      );
      const actual = acumulados.get(local.usuarioId);
      if (!actual) continue;
      actual.programadas += programadas;
      actual.entradas += Math.min(programadas, delLocal.length);
      actual.salidas += Math.min(
        programadas,
        delLocal.filter(({ completadaEn }) => completadaEn !== null).length,
      );
    }
    return acumulados;
  }

  private selectorUsuarios(): Prisma.UsuarioSelect {
    return {
      id: true,
      nombre: true,
      apellido: true,
      rol: { select: { descripcion: true } },
      superior: { select: { id: true, nombre: true, apellido: true } },
      _count: { select: { localesAsignados: { where: { activo: true } } } },
    };
  }

  async resumen(
    usuarioId: number,
    query: ResumenPresentismoQueryDto,
  ): Promise<ResumenPresentismoDto> {
    const gestor = await this.gestor(usuarioId);
    const fechaCorte =
      query.fecha ??
      new Intl.DateTimeFormat('en-CA', {
        timeZone: ZONA_HORARIA,
      }).format(new Date());
    const periodos = periodosPresentismo(fechaCorte);
    const usuarios = (await this.prisma.usuario.findMany({
      where: this.accesoCampo.filtroEquipoVisible(gestor),
      select: this.selectorUsuarios(),
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 200,
    })) as UsuarioFila[];
    const [dia, semana, mes] = await Promise.all([
      this.calcular(usuarios, periodos.dia),
      this.calcular(usuarios, periodos.semana),
      this.calcular(usuarios, periodos.mes),
    ]);
    const total = (
      datos: Map<number, Acumulado>,
      periodo: PeriodoPresentismo,
    ) => {
      const suma = [...datos.values()].reduce(
        (acc, valor) => ({
          programadas: acc.programadas + valor.programadas,
          entradas: acc.entradas + valor.entradas,
          salidas: acc.salidas + valor.salidas,
        }),
        { programadas: 0, entradas: 0, salidas: 0 },
      );
      return {
        ...periodo,
        ...suma,
        porcentaje: porcentaje(suma.programadas, suma.entradas),
      } satisfies MetricaPresentismoDto;
    };
    return {
      fechaCorte,
      dia: total(dia, periodos.dia),
      semana: total(semana, periodos.semana),
      mes: total(mes, periodos.mes),
    };
  }

  async listar(
    usuarioId: number,
    query: ListarPresentismoDto,
  ): Promise<RespuestaPaginada<FilaPresentismoDto>> {
    const gestor = await this.gestor(usuarioId);
    this.rango({ desde: query.desde, hasta: query.hasta });
    const filtros: Prisma.UsuarioWhereInput = {
      AND: [
        this.accesoCampo.filtroEquipoVisible(gestor),
        ...(query.usuarioId ? [{ id: query.usuarioId }] : []),
        ...(query.teamleaderId
          ? [
              {
                OR: [
                  { id: query.teamleaderId },
                  { superiorId: query.teamleaderId },
                ],
              },
            ]
          : []),
        ...filtrosBusquedaUsuario(query.buscar),
      ],
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, usuarios] = await Promise.all([
      this.prisma.usuario.count({ where: filtros }),
      this.prisma.usuario.findMany({
        where: filtros,
        select: this.selectorUsuarios(),
        orderBy: [
          { superiorId: 'asc' },
          { nombre: 'asc' },
          { apellido: 'asc' },
        ],
        skip,
        take,
      }) as Promise<UsuarioFila[]>,
    ]);
    const periodo = { desde: query.desde, hasta: query.hasta };
    const calculado = await this.calcular(usuarios, periodo);
    return respuestaPaginada(
      usuarios.map((usuario) => {
        const datos = calculado.get(usuario.id) ?? {
          programadas: 0,
          entradas: 0,
          salidas: 0,
        };
        return {
          ...periodo,
          usuario: {
            id: usuario.id,
            nombre: nombreCompleto(usuario),
            rol: usuario.rol?.descripcion ?? null,
          },
          teamleader: usuario.superior
            ? {
                id: usuario.superior.id,
                nombre: nombreCompleto(usuario.superior),
              }
            : null,
          localesAsignados: usuario._count.localesAsignados,
          ...datos,
          porcentaje: porcentaje(datos.programadas, datos.entradas),
        };
      }),
      total,
      page,
      limit,
    );
  }
}
