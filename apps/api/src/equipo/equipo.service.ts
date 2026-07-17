import { Injectable, NotFoundException } from '@nestjs/common';
import {
  respuestaPaginada,
  rangoPaginacion,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { filtrosBusquedaUsuario } from '../common/utils/busqueda-usuario';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import {
  PAGINA_EQUIPO,
  PAGINA_TAREAS,
} from '../impulsador/impulsador.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  EstadoTareaEquipoDto,
  ListarRepositoresEquipoDto,
  ListarTareasEquipoDto,
} from './dto/equipo.dto';
import type {
  RepositorEquipoDto,
  RespuestaTareasEquipoDto,
  TareaEquipoDto,
} from './interfaces/equipo.interface';

@Injectable()
export class EquipoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  async repositores(
    usuarioId: number,
    query: ListarRepositoresEquipoDto,
  ): Promise<RespuestaPaginada<RepositorEquipoDto>> {
    const actual = await this.accesoCampo.usuarioSupervisor(
      usuarioId,
      PAGINA_EQUIPO,
    );
    const alcance =
      await this.accesoCampo.filtroRepositoresDelSupervisor(actual);
    const where = {
      AND: [alcance, ...filtrosBusquedaUsuario(query.buscar)],
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, usuarios] = await Promise.all([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nombre: true,
          apellido: true,
          nombreLogin: true,
          correo: true,
          celular: true,
          _count: {
            select: { localesAsignados: true },
          },
          visitas: {
            select: {
              id: true,
              localId: true,
              iniciadaEn: true,
              completadaEn: true,
              local: {
                select: {
                  nombre: true,
                  cliente: { select: { nombre: true } },
                },
              },
              tareas: {
                select: { completada: true, completadaEn: true },
              },
            },
            orderBy: [{ iniciadaEn: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);

    const items: RepositorEquipoDto[] = usuarios.map((usuario) => {
      const visita = usuario.visitas[0] ?? null;
      const tareasCompletadas =
        visita?.tareas.filter((tarea) => tarea.completada).length ?? 0;
      const fechasActividad = visita
        ? [
            visita.iniciadaEn,
            visita.completadaEn,
            ...visita.tareas.map((tarea) => tarea.completadaEn),
          ].filter((fecha): fecha is Date => fecha !== null)
        : [];
      const ultimaActividad =
        fechasActividad.length > 0
          ? new Date(
              Math.max(...fechasActividad.map((fecha) => fecha.getTime())),
            ).toISOString()
          : null;

      return {
        id: usuario.id,
        nombreCompleto: `${usuario.nombre} ${usuario.apellido}`.trim(),
        nombreLogin: usuario.nombreLogin,
        correo: usuario.correo,
        celular: usuario.celular,
        localesCount: usuario._count.localesAsignados,
        visitaActual:
          visita && visita.completadaEn === null
            ? {
                localNombre: visita.local.nombre,
                clienteNombre: visita.local.cliente.nombre,
                iniciadaEn: visita.iniciadaEn.toISOString(),
                tareasTotal: visita.tareas.length,
                tareasCompletadas,
              }
            : null,
        ultimaActividad,
      };
    });
    return respuestaPaginada(items, total, page, limit);
  }

  async tareas(
    usuarioId: number,
    query: ListarTareasEquipoDto,
  ): Promise<RespuestaTareasEquipoDto> {
    const actual = await this.accesoCampo.usuarioSupervisor(
      usuarioId,
      PAGINA_TAREAS,
    );
    const alcance =
      await this.accesoCampo.filtroRepositoresDelSupervisor(actual);
    if (query.localId !== undefined) {
      return this.tareasDelLocal(actual.empresaId, alcance, query);
    }
    return this.tareasMaterializadas(actual.empresaId, alcance, query);
  }

  private async tareasDelLocal(
    empresaId: number,
    alcance: Awaited<
      ReturnType<
        AccesoOperacionesCampoService['filtroRepositoresDelSupervisor']
      >
    >,
    query: ListarTareasEquipoDto,
  ): Promise<RespuestaTareasEquipoDto> {
    const local = await this.prisma.local.findFirst({
      where: {
        id: query.localId,
        empresaId,
        usuario: {
          is: {
            AND: [
              alcance,
              ...(query.repositorId !== undefined
                ? [{ id: query.repositorId }]
                : []),
            ],
          },
        },
      },
      select: {
        id: true,
        nombre: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
    });
    if (!local?.usuario) throw new NotFoundException('El local no existe');
    const repositor = local.usuario;

    const selectVisita = {
      id: true,
    } as const;
    const visitaActiva = await this.prisma.visita.findFirst({
      where: {
        localId: local.id,
        usuarioId: repositor.id,
        completadaEn: null,
      },
      select: selectVisita,
      orderBy: [{ iniciadaEn: 'desc' }, { id: 'desc' }],
    });
    const visita =
      visitaActiva ??
      (await this.prisma.visita.findFirst({
        where: { localId: local.id, usuarioId: repositor.id },
        select: selectVisita,
        orderBy: [{ iniciadaEn: 'desc' }, { id: 'desc' }],
      }));

    const filtroEstado =
      query.estado === EstadoTareaEquipoDto.COMPLETADA
        ? visita
          ? { respuestas: { some: { visitaId: visita.id, completada: true } } }
          : { id: { in: [] as number[] } }
        : query.estado === EstadoTareaEquipoDto.PENDIENTE && visita
          ? {
              NOT: {
                respuestas: {
                  some: { visitaId: visita.id, completada: true },
                },
              },
            }
          : {};
    const whereBase = {
      clienteId: local.cliente.id,
      activo: true,
    };
    const where = {
      ...whereBase,
      ...filtroEstado,
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [totalChecklist, completadas, tareas] = await Promise.all([
      this.prisma.tareaCliente.count({ where: whereBase }),
      visita
        ? this.prisma.tareaCliente.count({
            where: {
              ...whereBase,
              respuestas: {
                some: { visitaId: visita.id, completada: true },
              },
            },
          })
        : Promise.resolve(0),
      this.prisma.tareaCliente.findMany({
        where,
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          requiereFoto: true,
          orden: true,
        },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    const respuestas =
      visita && tareas.length > 0
        ? await this.prisma.visitaTarea.findMany({
            where: {
              visitaId: visita.id,
              tareaId: { in: tareas.map((tarea) => tarea.id) },
            },
            select: {
              id: true,
              tareaId: true,
              completada: true,
              completadaEn: true,
              comentario: true,
              foto: true,
            },
            take: tareas.length,
          })
        : [];
    const respuestasPorTarea = new Map(
      respuestas.map((respuesta) => [respuesta.tareaId, respuesta]),
    );
    const repositorNombre = `${repositor.nombre} ${repositor.apellido}`.trim();
    const items: TareaEquipoDto[] = tareas.map((tarea) => {
      const respuesta = respuestasPorTarea.get(tarea.id) ?? null;
      return {
        tareaId: tarea.id,
        visitaTareaId: respuesta?.id ?? null,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        requiereFoto: tarea.requiereFoto,
        orden: tarea.orden,
        estado: respuesta?.completada ? 'COMPLETADA' : 'PENDIENTE',
        completadaEn: respuesta?.completadaEn?.toISOString() ?? null,
        comentario: respuesta?.comentario ?? null,
        tieneFoto: respuesta?.foto !== null && respuesta?.foto !== undefined,
        local: { id: local.id, nombre: local.nombre },
        cliente: local.cliente,
        repositor: { id: repositor.id, nombre: repositorNombre },
      };
    });
    const totalFiltrado =
      query.estado === EstadoTareaEquipoDto.COMPLETADA
        ? completadas
        : query.estado === EstadoTareaEquipoDto.PENDIENTE
          ? totalChecklist - completadas
          : totalChecklist;
    return {
      ...respuestaPaginada(items, totalFiltrado, page, limit),
      resumen: {
        total: totalChecklist,
        pendientes: totalChecklist - completadas,
        completadas,
      },
    };
  }

  private async tareasMaterializadas(
    empresaId: number,
    alcance: Awaited<
      ReturnType<
        AccesoOperacionesCampoService['filtroRepositoresDelSupervisor']
      >
    >,
    query: ListarTareasEquipoDto,
  ): Promise<RespuestaTareasEquipoDto> {
    const whereBase = {
      visita: {
        local: { empresaId },
        usuario: {
          is: {
            AND: [
              alcance,
              ...(query.repositorId !== undefined
                ? [{ id: query.repositorId }]
                : []),
            ],
          },
        },
      },
    };
    const where = {
      ...whereBase,
      completada:
        query.estado === undefined
          ? undefined
          : query.estado === EstadoTareaEquipoDto.COMPLETADA,
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [totalGeneral, completadas, tareas] = await Promise.all([
      this.prisma.visitaTarea.count({ where: whereBase }),
      this.prisma.visitaTarea.count({
        where: { ...whereBase, completada: true },
      }),
      this.prisma.visitaTarea.findMany({
        where,
        select: {
          id: true,
          completada: true,
          completadaEn: true,
          comentario: true,
          foto: true,
          tarea: {
            select: {
              id: true,
              titulo: true,
              descripcion: true,
              requiereFoto: true,
              orden: true,
            },
          },
          visita: {
            select: {
              usuario: {
                select: { id: true, nombre: true, apellido: true },
              },
              local: {
                select: {
                  id: true,
                  nombre: true,
                  cliente: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { visita: { iniciadaEn: 'desc' } },
          { tarea: { orden: 'asc' } },
          { id: 'desc' },
        ],
        skip,
        take,
      }),
    ]);
    const items: TareaEquipoDto[] = tareas.map((fila) => ({
      tareaId: fila.tarea.id,
      visitaTareaId: fila.id,
      titulo: fila.tarea.titulo,
      descripcion: fila.tarea.descripcion,
      requiereFoto: fila.tarea.requiereFoto,
      orden: fila.tarea.orden,
      estado: fila.completada ? 'COMPLETADA' : 'PENDIENTE',
      completadaEn: fila.completadaEn?.toISOString() ?? null,
      comentario: fila.comentario,
      tieneFoto: fila.foto !== null,
      local: { id: fila.visita.local.id, nombre: fila.visita.local.nombre },
      cliente: fila.visita.local.cliente,
      repositor: {
        id: fila.visita.usuario.id,
        nombre:
          `${fila.visita.usuario.nombre} ${fila.visita.usuario.apellido}`.trim(),
      },
    }));
    const totalFiltrado =
      query.estado === EstadoTareaEquipoDto.COMPLETADA
        ? completadas
        : query.estado === EstadoTareaEquipoDto.PENDIENTE
          ? totalGeneral - completadas
          : totalGeneral;
    return {
      ...respuestaPaginada(items, totalFiltrado, page, limit),
      resumen: {
        total: totalGeneral,
        pendientes: totalGeneral - completadas,
        completadas,
      },
    };
  }
}
