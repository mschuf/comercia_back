import { BadRequestException, Injectable } from '@nestjs/common';
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
import { ListarClientesRepositorDto } from './dto/listar-clientes-repositor.dto';
import { ListarLocalesRepositorDto } from './dto/listar-locales-repositor.dto';
import { ListarTareasRepositorDto } from './dto/listar-tareas-repositor.dto';
import { RutaHoyDto } from './dto/ruta-hoy.dto';
import type { ClienteRepositorDto } from './interfaces/cliente-repositor.interface';
import type { CoordenadaRuta } from './interfaces/osrm.interface';
import type { LocalRepositorDto } from './interfaces/local-repositor.interface';
import type {
  FuenteRuta,
  RutaDiariaDto,
} from './interfaces/ruta-diaria.interface';
import type { TareasLocalRepositorDto } from './interfaces/tareas-repositor.interface';
import { OsrmService } from './osrm.service';
import {
  completarMatriz,
  distanciaDeOrden,
  matrizHaversine,
  optimizarParadas,
} from './utils/optimizacion-ruta';

const ZONA_HORARIA_DEFECTO = 'America/Asuncion';
const MAX_PARADAS_DIARIAS = 50;
const VENTANA_VISITAS_MS = 36 * 60 * 60 * 1000;

@Injectable()
export class RepositorService {
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
              tareas: { where: { activo: true } },
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
              _count: { select: { tareas: { where: { activo: true } } } },
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
    const [total, locales] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          cliente: {
            select: {
              id: true,
              nombre: true,
              tareas: {
                where: { activo: true },
                select: {
                  id: true,
                  titulo: true,
                  descripcion: true,
                  requiereFoto: true,
                  orden: true,
                },
                orderBy: [{ orden: 'asc' }, { id: 'asc' }],
                take: MAX_TAREAS_POR_LOCAL,
              },
            },
          },
          visitas: {
            where: { usuarioId: usuario.id, completadaEn: null },
            select: {
              id: true,
              tareas: {
                select: { completada: true },
                take: MAX_TAREAS_POR_LOCAL,
              },
            },
            orderBy: { iniciadaEn: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ cliente: { nombre: 'asc' } }, { nombre: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      locales.map((local) => ({
        local: {
          id: local.id,
          nombre: local.nombre,
          cliente: { id: local.cliente.id, nombre: local.cliente.nombre },
        },
        tareas: local.cliente.tareas,
        completadasEnVisita:
          local.visitas[0]?.tareas.filter(({ completada }) => completada)
            .length ?? 0,
        visitaAbiertaId: local.visitas[0]?.id ?? null,
      })),
      total,
      page,
      limit,
    );
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
    const locales = await this.prisma.local.findMany({
      where: {
        empresaId: usuario.empresaId,
        usuarioId: usuario.id,
        activo: true,
        cliente: { activo: true },
      },
      select: {
        id: true,
        nombre: true,
        latitud: true,
        longitud: true,
        fechaVisita: true,
        zona: { select: { nombre: true } },
        programacionVisita: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            _count: { select: { tareas: { where: { activo: true } } } },
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
              usuarioId: usuario.id,
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
    const candidatas: Array<{
      clave: string;
      local: (typeof locales)[number];
      programadaEn: Date;
      visitaAbiertaId: number | null;
    }> = [];

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
          local,
          programadaEn,
          visitaAbiertaId: indice === 0 ? (abierta?.id ?? null) : null,
        });
      });
    }

    const origen =
      query.latitud !== undefined && query.longitud !== undefined
        ? { latitud: query.latitud, longitud: query.longitud }
        : null;
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

    return {
      fecha: fechaEnZonaIso(ahora, ZONA_HORARIA_DEFECTO),
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
            cliente: {
              id: candidata.local.cliente.id,
              nombre: candidata.local.cliente.nombre,
            },
            zona: candidata.local.zona?.nombre ?? null,
            latitud: candidata.local.latitud,
            longitud: candidata.local.longitud,
          },
          programadaEn: candidata.programadaEn.toISOString(),
          llegadaEstimada: parada.llegadaEstimada.toISOString(),
          distanciaDesdeAnteriorMetros: parada.distanciaDesdeAnteriorMetros,
          viajeDesdeAnteriorSegundos: parada.viajeDesdeAnteriorSegundos,
          tareasActivas: candidata.local.cliente._count.tareas,
          estado:
            candidata.visitaAbiertaId !== null
              ? 'EN_CURSO'
              : ahora.getTime() > candidata.programadaEn.getTime()
                ? 'ATRASADA'
                : 'PENDIENTE',
          visitaAbiertaId: candidata.visitaAbiertaId,
        };
      }),
    };
  }
}
