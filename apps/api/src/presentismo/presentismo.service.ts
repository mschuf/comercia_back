import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import {
  ROL_IMPULSADOR,
  ROL_TEAMLEADER_IMPULSADOR,
} from '../common/constants/roles-negocio';
import { filtrosBusquedaUsuario } from '../common/utils/busqueda-usuario';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import {
  PAGINA_ENTRADA,
  PAGINA_EQUIPO,
  PAGINA_MARCACIONES,
  PAGINA_PRESENTISMO,
  PAGINA_VISITAS,
} from '../impulsador/impulsador.constants';
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
  AcumuladoPresentismo,
  FilaPresentismoDto,
  ResumenInicioOperativoDto,
  ResumenPresentismoDto,
  UsuarioFilaPresentismo,
} from './interfaces/presentismo.interface';
import {
  diasDelPeriodo,
  periodosPresentismo,
  type PeriodoPresentismo,
} from './utils/periodos-presentismo';
import {
  perfilResumenInicio,
  porcentajePresentismo,
  totalPresentismo,
} from './utils/resumen-presentismo';

const ZONA_HORARIA = 'America/Asuncion';

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
    usuarios: UsuarioFilaPresentismo[],
    periodo: PeriodoPresentismo,
  ): Promise<Map<number, AcumuladoPresentismo>> {
    const ids = usuarios.map(({ id }) => id);
    const acumulados = new Map<number, AcumuladoPresentismo>(
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

  async resumenInicio(usuarioId: number): Promise<ResumenInicioOperativoDto> {
    const actual = await this.accesoCampo.usuario(usuarioId, [
      PAGINA_PRESENTISMO,
      PAGINA_MARCACIONES,
      PAGINA_ENTRADA,
      PAGINA_EQUIPO,
      PAGINA_VISITAS,
    ]);
    const fechaCorte = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_HORARIA,
    }).format(new Date());
    const periodos = periodosPresentismo(fechaCorte);
    const filtro: Prisma.UsuarioWhereInput = actual.esGestor
      ? this.accesoCampo.filtroEquipoVisible(actual)
      : {
          id: actual.id,
          empresaId: actual.empresaId,
          isActive: true,
        };
    const usuarios = (await this.prisma.usuario.findMany({
      where: filtro,
      select: this.selectorUsuarios(),
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
      take: 200,
    })) as UsuarioFilaPresentismo[];
    const ids = usuarios.map(({ id }) => id);
    const [dia, semana, mes, enCurso] = await Promise.all([
      this.calcular(usuarios, periodos.dia),
      this.calcular(usuarios, periodos.semana),
      this.calcular(usuarios, periodos.mes),
      ids.length === 0
        ? Promise.resolve(0)
        : this.prisma.visita.count({
            where: { usuarioId: { in: ids }, completadaEn: null },
          }),
    ]);
    return {
      fechaCorte,
      perfil: perfilResumenInicio(actual),
      alcance: {
        personas: usuarios.length,
        teamleaders: usuarios.filter(
          ({ rol }) => rol?.descripcion === ROL_TEAMLEADER_IMPULSADOR,
        ).length,
        impulsadores: usuarios.filter(
          ({ rol }) => rol?.descripcion === ROL_IMPULSADOR,
        ).length,
        localesAsignados: usuarios.reduce(
          (total, usuario) => total + usuario._count.localesAsignados,
          0,
        ),
      },
      actividad: { enCurso },
      dia: totalPresentismo(dia, periodos.dia),
      semana: totalPresentismo(semana, periodos.semana),
      mes: totalPresentismo(mes, periodos.mes),
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
    })) as UsuarioFilaPresentismo[];
    const [dia, semana, mes] = await Promise.all([
      this.calcular(usuarios, periodos.dia),
      this.calcular(usuarios, periodos.semana),
      this.calcular(usuarios, periodos.mes),
    ]);
    return {
      fechaCorte,
      dia: totalPresentismo(dia, periodos.dia),
      semana: totalPresentismo(semana, periodos.semana),
      mes: totalPresentismo(mes, periodos.mes),
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
      }) as Promise<UsuarioFilaPresentismo[]>,
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
          porcentaje: porcentajePresentismo(datos.programadas, datos.entradas),
        };
      }),
      total,
      page,
      limit,
    );
  }
}
