import { Injectable, NotFoundException } from '@nestjs/common';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import { FotosService } from '../impulsador/fotos.service';
import {
  PAGINA_TAREAS,
  PAGINA_VISITAS,
} from '../impulsador/impulsador.constants';
import { PrismaService } from '../prisma/prisma.service';
import { ListarNotificacionesDto } from './dto/listar-notificaciones.dto';
import type { NotificacionLeidaDto } from './interfaces/notificacion-leida.interface';
import type { NotificacionTareaDto } from './interfaces/notificacion.interface';
import type { NotificacionesNoLeidasDto } from './interfaces/notificaciones-no-leidas.interface';
import { aNotificacionDto } from './utils/notificacion';

const SELECT_NOTIFICACION = {
  id: true,
  comentario: true,
  reportadaEn: true,
  leidaEn: true,
  visitaTarea: {
    select: {
      id: true,
      tarea: { select: { titulo: true } },
      visita: {
        select: {
          usuario: { select: { id: true, nombre: true, apellido: true } },
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
  },
} as const;

@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
    private readonly fotos: FotosService,
  ) {}

  async listar(
    usuarioId: number,
    query: ListarNotificacionesDto,
  ): Promise<RespuestaPaginada<NotificacionTareaDto>> {
    const supervisor = await this.accesoCampo.usuarioSupervisor(
      usuarioId,
      PAGINA_TAREAS,
    );
    const where = {
      supervisorId: supervisor.id,
      visitaTarea: {
        visita: { local: { empresaId: supervisor.empresaId } },
      },
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, notificaciones] = await Promise.all([
      this.prisma.novedadTarea.count({ where }),
      this.prisma.novedadTarea.findMany({
        where,
        select: SELECT_NOTIFICACION,
        orderBy: [{ reportadaEn: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);

    return respuestaPaginada(
      notificaciones.map(aNotificacionDto),
      total,
      page,
      limit,
    );
  }

  async noLeidas(usuarioId: number): Promise<NotificacionesNoLeidasDto> {
    const supervisor = await this.accesoCampo.usuarioSupervisor(
      usuarioId,
      PAGINA_TAREAS,
    );
    const noLeidas = await this.prisma.novedadTarea.count({
      where: {
        supervisorId: supervisor.id,
        leidaEn: null,
        visitaTarea: {
          visita: { local: { empresaId: supervisor.empresaId } },
        },
      },
    });
    return { noLeidas };
  }

  async marcarLeida(
    usuarioId: number,
    id: number,
  ): Promise<NotificacionLeidaDto> {
    const supervisor = await this.accesoCampo.usuarioSupervisor(
      usuarioId,
      PAGINA_TAREAS,
    );
    const where = {
      id,
      supervisorId: supervisor.id,
      visitaTarea: {
        visita: { local: { empresaId: supervisor.empresaId } },
      },
    };
    const notificacion = await this.prisma.novedadTarea.findFirst({
      where,
      select: { id: true, leidaEn: true },
    });
    if (!notificacion) {
      throw new NotFoundException('La notificación no existe');
    }

    if (notificacion.leidaEn) {
      return {
        id: notificacion.id,
        leidaEn: notificacion.leidaEn.toISOString(),
      };
    }

    const leidaEn = new Date();
    const actualizadas = await this.prisma.novedadTarea.updateMany({
      where: { ...where, leidaEn: null },
      data: { leidaEn },
    });
    if (actualizadas.count === 0) {
      const concurrente = await this.prisma.novedadTarea.findFirst({
        where,
        select: { id: true, leidaEn: true },
      });
      if (!concurrente?.leidaEn) {
        throw new NotFoundException('La notificación no existe');
      }
      return {
        id: concurrente.id,
        leidaEn: concurrente.leidaEn.toISOString(),
      };
    }
    return { id: notificacion.id, leidaEn: leidaEn.toISOString() };
  }

  async rutaFoto(usuarioId: number, id: number): Promise<string> {
    const usuario = await this.accesoCampo.usuario(usuarioId, [
      PAGINA_VISITAS,
      PAGINA_TAREAS,
    ]);
    const notificacion = await this.prisma.novedadTarea.findFirst({
      where: {
        id,
        visitaTarea: {
          visita: { local: { empresaId: usuario.empresaId } },
        },
        OR: [
          { reportadoPorId: usuario.id },
          { supervisorId: usuario.id },
          ...(usuario.esGestor
            ? [
                {
                  reportadoPor: {
                    is: {
                      empresaId: usuario.empresaId,
                      superiorId: usuario.id,
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: { foto: true },
    });
    const ruta = notificacion
      ? this.fotos.rutaAbsoluta(notificacion.foto)
      : null;
    if (!ruta) {
      throw new NotFoundException('La foto no existe');
    }
    return ruta;
  }
}
