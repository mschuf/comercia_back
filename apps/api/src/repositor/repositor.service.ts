import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  respuestaPaginada,
  rangoPaginacion,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import {
  MAX_TAREAS_POR_LOCAL,
  PAGINA_CLIENTES,
  PAGINA_TAREAS,
  PAGINA_VISITAS,
} from '../impulsador/impulsador.constants';
import {
  aProgramacionVisitaDto,
  fechaEnZonaIso,
  ocurrenciasVisitaEnDia,
} from '../impulsador/utils/programacion-visita';
import { PrismaService } from '../prisma/prisma.service';
import { filtroTareaGlobalVisiblePara } from '../tareas/utils/visibilidad-tarea';
import { ListarClientesRepositorDto } from './dto/listar-clientes-repositor.dto';
import { ListarLocalesRepositorDto } from './dto/listar-locales-repositor.dto';
import { ListarTareasRepositorDto } from './dto/listar-tareas-repositor.dto';
import { ListarVisitasHoyDto } from './dto/listar-visitas-hoy.dto';
import { RutaHoyDto } from './dto/ruta-hoy.dto';
import { RendimientoImpulsadorDto as FiltroRendimientoImpulsadorDto } from './dto/rendimiento-impulsador.dto';
import type { AgendaDiaria } from './interfaces/agenda-diaria.interface';
import type { ClienteRepositorDto } from './interfaces/cliente-repositor.interface';
import type { CoordenadaRuta } from './interfaces/osrm.interface';
import type { LocalRepositorDto } from './interfaces/local-repositor.interface';
import type {
  FuenteRuta,
  RutaDiariaDto,
} from './interfaces/ruta-diaria.interface';
import type { TareasLocalRepositorDto } from './interfaces/tareas-repositor.interface';
import type { VisitaHoyDto } from './interfaces/visita-hoy.interface';
import type {
  RendimientoImpulsadorDto,
  RendimientoImpulsadorFila,
} from './interfaces/rendimiento-impulsador.interface';
import { OsrmService } from './osrm.service';
import {
  actualizarRutaGuardada,
  esRutaDiariaGuardada,
  firmaAgendaRuta,
} from './utils/cache-ruta-diaria';
import { estadoVisitaProgramada } from './utils/estado-visita-programada';
import {
  completarMatriz,
  distanciaDeOrden,
  matrizHaversine,
  optimizarParadas,
} from './utils/optimizacion-ruta';

const ZONA_HORARIA_DEFECTO = 'America/Asuncion';
const MAX_PARADAS_DIARIAS = 50;
const VENTANA_VISITAS_MS = 36 * 60 * 60 * 1000;
const CACHE_RESPALDO_MS = 5 * 60 * 1000;

function tareasVisiblesPara(
  usuarioId: number,
  rolDescripcion: string | null,
): Prisma.TareaClienteWhereInput {
  return {
    activo: true,
    OR: [
      { tareaGlobalId: null },
      {
        tareaGlobal: {
          is: filtroTareaGlobalVisiblePara({ id: usuarioId, rolDescripcion }),
        },
      },
    ],
  };
}

@Injectable()
export class RepositorService {
  private readonly logger = new Logger(RepositorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
    private readonly osrm: OsrmService,
  ) {}

  async clientes(
    usuarioId: number,
    query: ListarClientesRepositorDto,
  ): Promise<RespuestaPaginada<ClienteRepositorDto>> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_CLIENTES,
    );
    const where = {
      empresaId: usuario.empresaId,
      activo: true,
      locales: { some: { usuarioId: usuario.id, activo: true } },
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, clientes] = await Promise.all([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          _count: {
            select: {
              locales: { where: { usuarioId: usuario.id, activo: true } },
              tareas: {
                where: tareasVisiblesPara(usuario.id, usuario.rolDescripcion),
              },
            },
          },
        },
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    const proximas =
      clientes.length === 0
        ? []
        : await this.prisma.local.groupBy({
            by: ['clienteId'],
            where: {
              clienteId: { in: clientes.map(({ id }) => id) },
              usuarioId: usuario.id,
              activo: true,
              fechaVisita: { gte: new Date() },
            },
            _min: { fechaVisita: true },
            orderBy: { clienteId: 'asc' },
            take: 50,
          });
    const proximaPorCliente = new Map(
      proximas.map((fila) => [
        fila.clienteId,
        fila._min.fechaVisita?.toISOString() ?? null,
      ]),
    );
    return respuestaPaginada(
      clientes.map((cliente) => ({
        id: cliente.id,
        nombre: cliente.nombre,
        localesAsignados: cliente._count.locales,
        tareasActivas: cliente._count.tareas,
        proximaVisita: proximaPorCliente.get(cliente.id) ?? null,
      })),
      total,
      page,
      limit,
    );
  }

  async locales(
    usuarioId: number,
    query: ListarLocalesRepositorDto,
  ): Promise<RespuestaPaginada<LocalRepositorDto>> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_CLIENTES,
    );
    const where = {
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      activo: true,
      clienteId: query.clienteId,
      cliente: { activo: true },
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, locales] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          latitud: true,
          longitud: true,
          fechaVisita: true,
          requiereFotoPresencia: true,
          zona: { select: { id: true, nombre: true } },
          programacionVisita: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              _count: {
                select: {
                  tareas: {
                    where: tareasVisiblesPara(
                      usuario.id,
                      usuario.rolDescripcion,
                    ),
                  },
                },
              },
            },
          },
        },
        orderBy: [{ cliente: { nombre: 'asc' } }, { nombre: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      locales.map((local) => ({
        id: local.id,
        nombre: local.nombre,
        cliente: { id: local.cliente.id, nombre: local.cliente.nombre },
        latitud: local.latitud,
        longitud: local.longitud,
        zona: local.zona,
        fechaVisita: local.fechaVisita?.toISOString() ?? null,
        programacion: local.programacionVisita
          ? aProgramacionVisitaDto(local.programacionVisita)
          : null,
        tareasActivas: local.cliente._count.tareas,
        requiereFotoPresencia: local.requiereFotoPresencia,
      })),
      total,
      page,
      limit,
    );
  }

  async tareas(
    usuarioId: number,
    query: ListarTareasRepositorDto,
  ): Promise<RespuestaPaginada<TareasLocalRepositorDto>> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_TAREAS,
    );
    const where = {
      empresaId: usuario.empresaId,
      usuarioId: usuario.id,
      activo: true,
      cliente: { activo: true },
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const fechaHoy = fechaEnZonaIso(new Date(), ZONA_HORARIA_DEFECTO);
    const [total, locales] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          fechaVisita: true,
          requiereFotoPresencia: true,
          zona: { select: { id: true, nombre: true } },
          programacionVisita: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              tareas: {
                where: tareasVisiblesPara(usuario.id, usuario.rolDescripcion),
                select: {
                  id: true,
                  titulo: true,
                  descripcion: true,
                  requiereFoto: true,
                  orden: true,
                  tareaGlobal: {
                    select: {
                      alcanceLocales: true,
                      locales: {
                        select: { localId: true },
                        take: 200,
                      },
                    },
                  },
                },
                orderBy: [{ orden: 'asc' }, { id: 'asc' }],
                take: MAX_TAREAS_POR_LOCAL,
              },
            },
          },
          visitas: {
            where: { usuarioId: usuario.id },
            select: {
              id: true,
              completadaEn: true,
              tareas: {
                select: { completada: true },
                take: MAX_TAREAS_POR_LOCAL,
              },
            },
            orderBy: { iniciadaEn: 'desc' },
            take: 2,
          },
        },
        orderBy: [{ cliente: { nombre: 'asc' } }, { nombre: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      locales.map((local) => {
        const visitaAbierta = local.visitas.find(
          ({ completadaEn }) => completadaEn === null,
        );
        return {
          local: {
            id: local.id,
            nombre: local.nombre,
            cliente: { id: local.cliente.id, nombre: local.cliente.nombre },
            zona: local.zona,
            fechaVisita: local.fechaVisita?.toISOString() ?? null,
            programacion: local.programacionVisita
              ? aProgramacionVisitaDto(local.programacionVisita)
              : null,
            requiereFotoPresencia: local.requiereFotoPresencia,
          },
          tareas: local.cliente.tareas
            .filter(
              (tarea) =>
                !tarea.tareaGlobal ||
                tarea.tareaGlobal.alcanceLocales === 'TODOS' ||
                tarea.tareaGlobal.locales.some(
                  ({ localId }) => localId === local.id,
                ),
            )
            .map((tarea) => ({
              id: tarea.id,
              titulo: tarea.titulo,
              descripcion: tarea.descripcion,
              requiereFoto: tarea.requiereFoto,
              orden: tarea.orden,
            })),
          completadasEnVisita:
            visitaAbierta?.tareas.filter(({ completada }) => completada)
              .length ?? 0,
          visitaAbiertaId: visitaAbierta?.id ?? null,
          visitaCompletadaHoy:
            visitaAbierta === undefined &&
            local.visitas.some(
              ({ completadaEn }) =>
                completadaEn !== null &&
                fechaEnZonaIso(completadaEn, ZONA_HORARIA_DEFECTO) === fechaHoy,
            ),
        };
      }),
      total,
      page,
      limit,
    );
  }

  async visitasHoy(
    usuarioId: number,
    query: ListarVisitasHoyDto,
  ): Promise<RespuestaPaginada<VisitaHoyDto>> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_VISITAS,
    );
    const ahora = new Date();
    const agenda = await this.obtenerAgendaDiaria(
      usuario.id,
      usuario.empresaId,
      usuario.rolDescripcion,
      ahora,
    );
    const { skip, take, page, limit } = rangoPaginacion(query);
    const items = agenda.candidatas
      .slice(skip, skip + take)
      .map((candidata, indice) => ({
        clave: candidata.clave,
        orden: skip + indice + 1,
        local: {
          id: candidata.local.id,
          nombre: candidata.local.nombre,
          cliente: candidata.local.cliente,
          zona: candidata.local.zona,
          latitud: candidata.local.latitud,
          longitud: candidata.local.longitud,
          radioMetros: candidata.local.radioMetros ?? 200,
        },
        programadaEn: candidata.programadaEn.toISOString(),
        tareasActivas: candidata.local.tareasActivas,
        estado: estadoVisitaProgramada(
          candidata.programadaEn,
          candidata.visitaAbiertaId,
          ahora,
        ),
        visitaAbiertaId: candidata.visitaAbiertaId,
      }));
    return respuestaPaginada(items, agenda.candidatas.length, page, limit);
  }

  async rendimiento(
    usuarioId: number,
    query: FiltroRendimientoImpulsadorDto,
  ): Promise<RendimientoImpulsadorDto> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_VISITAS,
    );
    const hoy = fechaEnZonaIso(new Date(), ZONA_HORARIA_DEFECTO);
    const hasta = query.hasta ?? hoy;
    const desde =
      query.desde ??
      new Date(new Date(`${hasta}T00:00:00.000Z`).getTime() - 29 * 86_400_000)
        .toISOString()
        .slice(0, 10);
    const inicio = new Date(`${desde}T00:00:00.000Z`);
    const fin = new Date(`${hasta}T00:00:00.000Z`);
    const dias =
      Math.floor((fin.getTime() - inicio.getTime()) / 86_400_000) + 1;
    if (
      Number.isNaN(inicio.getTime()) ||
      Number.isNaN(fin.getTime()) ||
      inicio > fin ||
      dias > 366
    ) {
      throw new BadRequestException('El rango de rendimiento no es válido');
    }

    const [locales, filas, visitasEnCurso] = await Promise.all([
      this.prisma.local.findMany({
        where: {
          empresaId: usuario.empresaId,
          usuarioId: usuario.id,
          activo: true,
        },
        select: { fechaVisita: true, programacionVisita: true },
        take: 200,
      }),
      this.prisma.$queryRaw<RendimientoImpulsadorFila[]>(Prisma.sql`
        SELECT
          COUNT(DISTINCT v.id) FILTER (WHERE v.completada_en IS NOT NULL)::int AS presentaciones_realizadas,
          COUNT(DISTINCT v.local_id) FILTER (WHERE v.completada_en IS NOT NULL)::int AS locales_visitados,
          COUNT(vt.id)::int AS tareas_totales,
          COUNT(vt.id) FILTER (WHERE vt.completada)::int AS tareas_completadas
        FROM "visitas" v
        INNER JOIN "locales" l ON l.id = v.local_id
        LEFT JOIN "visita_tareas" vt ON vt.visita_id = v.id
        WHERE v.usuario_id = ${usuario.id}
          AND l.empresa_id = ${usuario.empresaId}
          AND v.iniciada_en >= (
            ${desde}::date::timestamp AT TIME ZONE ${ZONA_HORARIA_DEFECTO}
          )
          AND v.iniciada_en < (
            (${hasta}::date + INTERVAL '1 day')::timestamp
            AT TIME ZONE ${ZONA_HORARIA_DEFECTO}
          )
      `),
      this.prisma.visita.count({
        where: { usuarioId: usuario.id, completadaEn: null },
      }),
    ]);

    let presentacionesProgramadas = 0;
    for (const local of locales) {
      for (let indice = 0; indice < dias; indice += 1) {
        const dia = new Date(inicio.getTime() + indice * 86_400_000);
        if (local.programacionVisita) {
          presentacionesProgramadas += ocurrenciasVisitaEnDia(
            local.programacionVisita,
            dia,
          ).length;
        } else if (
          local.fechaVisita &&
          fechaEnZonaIso(local.fechaVisita, ZONA_HORARIA_DEFECTO) ===
            dia.toISOString().slice(0, 10)
        ) {
          presentacionesProgramadas += 1;
        }
      }
    }
    const fila = filas[0];
    const realizadas = fila?.presentaciones_realizadas ?? 0;
    const tareasTotales = fila?.tareas_totales ?? 0;
    const tareasCompletadas = fila?.tareas_completadas ?? 0;
    return {
      desde,
      hasta,
      localesAsignados: locales.length,
      localesVisitados: fila?.locales_visitados ?? 0,
      presentacionesProgramadas,
      presentacionesRealizadas: realizadas,
      presentacionesPorcentaje:
        presentacionesProgramadas === 0
          ? 0
          : Math.round(
              Math.min(100, (realizadas * 1000) / presentacionesProgramadas),
            ) / 10,
      tareasTotales,
      tareasCompletadas,
      tareasPorcentaje:
        tareasTotales === 0
          ? 0
          : Math.round((tareasCompletadas * 1000) / tareasTotales) / 10,
      visitasEnCurso,
    };
  }

  private async obtenerAgendaDiaria(
    usuarioId: number,
    empresaId: number,
    rolDescripcion: string | null,
    ahora: Date,
  ): Promise<AgendaDiaria> {
    const locales = await this.prisma.local.findMany({
      where: {
        empresaId,
        usuarioId,
        activo: true,
        cliente: { activo: true },
      },
      select: {
        id: true,
        nombre: true,
        latitud: true,
        longitud: true,
        radioMetros: true,
        fechaVisita: true,
        zona: { select: { nombre: true } },
        programacionVisita: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            _count: {
              select: {
                tareas: {
                  where: tareasVisiblesPara(usuarioId, rolDescripcion),
                },
              },
            },
          },
        },
      },
      orderBy: [{ fechaVisita: 'asc' }, { id: 'asc' }],
      take: MAX_PARADAS_DIARIAS,
    });
    const visitas =
      locales.length === 0
        ? []
        : await this.prisma.visita.findMany({
            where: {
              usuarioId,
              localId: { in: locales.map(({ id }) => id) },
              iniciadaEn: {
                gte: new Date(ahora.getTime() - VENTANA_VISITAS_MS),
              },
            },
            select: {
              id: true,
              localId: true,
              iniciadaEn: true,
              completadaEn: true,
            },
            orderBy: { iniciadaEn: 'asc' },
            take: 200,
          });

    let totalProgramadas = 0;
    let totalCompletadas = 0;
    const candidatas: AgendaDiaria['candidatas'] = [];
    for (const local of locales) {
      const zona =
        local.programacionVisita?.zonaHoraria ?? ZONA_HORARIA_DEFECTO;
      const ocurrencias = local.programacionVisita
        ? ocurrenciasVisitaEnDia(local.programacionVisita, ahora)
        : local.fechaVisita &&
            fechaEnZonaIso(local.fechaVisita, zona) ===
              fechaEnZonaIso(ahora, zona)
          ? [local.fechaVisita]
          : [];
      const visitasHoy = visitas.filter(
        (visita) =>
          visita.localId === local.id &&
          fechaEnZonaIso(visita.iniciadaEn, zona) ===
            fechaEnZonaIso(ahora, zona),
      );
      const completadas = visitasHoy.filter(
        ({ completadaEn }) => completadaEn !== null,
      ).length;
      const abierta = visitasHoy.find(
        ({ completadaEn }) => completadaEn === null,
      );
      totalProgramadas += ocurrencias.length;
      totalCompletadas += Math.min(completadas, ocurrencias.length);
      ocurrencias.slice(completadas).forEach((programadaEn, indice) => {
        candidatas.push({
          clave: `${local.id}-${programadaEn.toISOString()}`,
          local: {
            id: local.id,
            nombre: local.nombre,
            cliente: {
              id: local.cliente.id,
              nombre: local.cliente.nombre,
            },
            zona: local.zona?.nombre ?? null,
            latitud: local.latitud,
            longitud: local.longitud,
            radioMetros: local.radioMetros,
            tareasActivas: local.cliente._count.tareas,
          },
          programadaEn,
          visitaAbiertaId: indice === 0 ? (abierta?.id ?? null) : null,
        });
      });
    }
    candidatas.sort(
      (a, b) => a.programadaEn.getTime() - b.programadaEn.getTime(),
    );
    return {
      fecha: fechaEnZonaIso(ahora, ZONA_HORARIA_DEFECTO),
      totalProgramadas,
      totalCompletadas,
      candidatas,
    };
  }

  async rutaHoy(usuarioId: number, query: RutaHoyDto): Promise<RutaDiariaDto> {
    const usuario = await this.accesoCampo.usuarioRepositor(
      usuarioId,
      PAGINA_VISITAS,
    );
    const tieneLatitud = query.latitud !== undefined;
    const tieneLongitud = query.longitud !== undefined;
    if (tieneLatitud !== tieneLongitud) {
      throw new BadRequestException('Latitud y longitud deben enviarse juntas');
    }

    const ahora = new Date();
    const agenda = await this.obtenerAgendaDiaria(
      usuario.id,
      usuario.empresaId,
      usuario.rolDescripcion,
      ahora,
    );
    const { candidatas, totalProgramadas, totalCompletadas } = agenda;

    const origen =
      query.latitud !== undefined && query.longitud !== undefined
        ? { latitud: query.latitud, longitud: query.longitud }
        : null;
    const firmaAgenda = firmaAgendaRuta(agenda);
    const guardada = await this.prisma.rutaDiariaRepositor.findUnique({
      where: {
        usuarioId_fecha: {
          usuarioId: usuario.id,
          fecha: agenda.fecha,
        },
      },
      select: {
        firmaAgenda: true,
        datos: true,
        updatedAt: true,
      },
    });
    if (
      query.recalcular !== 'true' &&
      guardada?.firmaAgenda === firmaAgenda &&
      esRutaDiariaGuardada(guardada.datos)
    ) {
      const necesitaOrigen =
        origen !== null &&
        candidatas.length > 0 &&
        !guardada.datos.usaUbicacionActual;
      const respaldoVigente =
        guardada.datos.fuente === 'OSRM' ||
        ahora.getTime() - guardada.updatedAt.getTime() < CACHE_RESPALDO_MS;
      if (!necesitaOrigen && respaldoVigente) {
        return actualizarRutaGuardada(guardada.datos, agenda, ahora);
      }
    }

    const coordenadas: CoordenadaRuta[] = [
      ...(origen ? [origen] : []),
      ...candidatas.map(({ local }) => ({
        latitud: local.latitud,
        longitud: local.longitud,
      })),
    ];
    const respaldo = matrizHaversine(coordenadas);
    let matriz = respaldo;
    let fuente: FuenteRuta = 'HAVERSINE';
    if (coordenadas.length > 1) {
      try {
        matriz = completarMatriz(await this.osrm.tabla(coordenadas), respaldo);
        fuente = 'OSRM';
      } catch {
        matriz = respaldo;
      }
    }
    const desplazamiento = origen ? 1 : 0;
    const paradasBase = candidatas.map((candidata, indice) => ({
      clave: candidata.clave,
      indiceMatriz: indice + desplazamiento,
      programadaEn: candidata.programadaEn,
    }));
    const ordenOriginal = [...paradasBase].sort(
      (a, b) => a.programadaEn.getTime() - b.programadaEn.getTime(),
    );
    const optimizadas = optimizarParadas(
      paradasBase,
      matriz,
      origen ? 0 : null,
      ahora,
    );
    const candidatasPorClave = new Map(
      candidatas.map((candidata) => [candidata.clave, candidata]),
    );
    const coordenadasOrdenadas = [
      ...(origen ? [origen] : []),
      ...optimizadas.map((parada) => {
        const candidata = candidatasPorClave.get(parada.clave)!;
        return {
          latitud: candidata.local.latitud,
          longitud: candidata.local.longitud,
        };
      }),
    ];
    let geometria: [number, number][] = coordenadasOrdenadas.map(
      ({ latitud, longitud }) => [latitud, longitud],
    );
    if (coordenadasOrdenadas.length > 1) {
      try {
        geometria = (await this.osrm.ruta(coordenadasOrdenadas)).geometria;
      } catch {
        // La matriz sigue siendo util; el mapa dibuja una linea directa segura.
      }
    }
    const distanciaTotalMetros = optimizadas.reduce(
      (total, parada) => total + parada.distanciaDesdeAnteriorMetros,
      0,
    );
    const duracionTrasladoSegundos = optimizadas.reduce(
      (total, parada) => total + parada.viajeDesdeAnteriorSegundos,
      0,
    );

    const resultado: RutaDiariaDto = {
      fecha: agenda.fecha,
      generadaEn: ahora.toISOString(),
      fuente,
      usaUbicacionActual: origen !== null,
      totalProgramadas,
      totalCompletadas,
      distanciaTotalMetros,
      duracionTrasladoSegundos,
      ahorroEstimadoMetros: Math.max(
        0,
        Math.round(
          distanciaDeOrden(ordenOriginal, matriz, origen ? 0 : null) -
            distanciaTotalMetros,
        ),
      ),
      geometria,
      paradas: optimizadas.map((parada, indice) => {
        const candidata = candidatasPorClave.get(parada.clave)!;
        return {
          clave: parada.clave,
          orden: indice + 1,
          local: {
            id: candidata.local.id,
            nombre: candidata.local.nombre,
            cliente: candidata.local.cliente,
            zona: candidata.local.zona,
            latitud: candidata.local.latitud,
            longitud: candidata.local.longitud,
          },
          programadaEn: candidata.programadaEn.toISOString(),
          llegadaEstimada: parada.llegadaEstimada.toISOString(),
          distanciaDesdeAnteriorMetros: parada.distanciaDesdeAnteriorMetros,
          viajeDesdeAnteriorSegundos: parada.viajeDesdeAnteriorSegundos,
          tareasActivas: candidata.local.tareasActivas,
          estado: estadoVisitaProgramada(
            candidata.programadaEn,
            candidata.visitaAbiertaId,
            ahora,
          ),
          visitaAbiertaId: candidata.visitaAbiertaId,
        };
      }),
    };
    try {
      await this.prisma.rutaDiariaRepositor.upsert({
        where: {
          usuarioId_fecha: {
            usuarioId: usuario.id,
            fecha: agenda.fecha,
          },
        },
        create: {
          usuarioId: usuario.id,
          fecha: agenda.fecha,
          firmaAgenda,
          datos: resultado as unknown as Prisma.InputJsonValue,
        },
        update: {
          firmaAgenda,
          datos: resultado as unknown as Prisma.InputJsonValue,
        },
        select: { id: true },
      });
      await this.prisma.rutaDiariaRepositor.deleteMany({
        where: {
          usuarioId: usuario.id,
          fecha: { lt: agenda.fecha },
        },
      });
    } catch (problema) {
      this.logger.warn(
        `No se pudo guardar la ruta diaria del usuario ${usuario.id}: ${
          problema instanceof Error ? problema.message : 'error desconocido'
        }`,
      );
    }
    return resultado;
  }
}
