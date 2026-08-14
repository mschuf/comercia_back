import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import {
  ROL_SUPERVISOR_IMPULSADOR,
  ROL_TEAMLEADER_IMPULSADOR,
} from '../common/constants/roles-negocio';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import {
  MAX_TAREAS_POR_LOCAL,
  PAGINA_TAREAS,
} from '../impulsador/impulsador.constants';
import type { UsuarioOperacionesCampo } from '../impulsador/interfaces/usuario-operaciones-campo.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarTareaGlobalDto,
  AlcanceTareaDto,
  CrearTareaGlobalDto,
  ListarTareasGlobalesDto,
} from './dto/tarea-global.dto';
import type { TareaGlobalDto } from './interfaces/tarea-global.interface';
import type { TareasQuitadasUsuarioDto } from './interfaces/tareas-quitadas-usuario.interface';
import { filtroTareaGlobalVisiblePara } from './utils/visibilidad-tarea';

const SELECT_TAREA_GLOBAL = {
  id: true,
  creadoPorId: true,
  titulo: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
  alcance: true,
  alcanceLocales: true,
  createdAt: true,
  updatedAt: true,
  destinatarios: {
    select: {
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: { usuarioId: 'asc' as const },
  },
  locales: {
    select: { local: { select: { id: true, nombre: true } } },
    orderBy: { localId: 'asc' as const },
  },
  _count: { select: { tareas: true, exclusiones: true } },
} as const;

type TareaGlobalFila = {
  id: number;
  creadoPorId: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  alcance: 'TODOS' | 'SELECCIONADOS';
  alcanceLocales: 'TODOS' | 'SELECCIONADOS';
  createdAt: Date;
  updatedAt: Date;
  _count: { tareas: number; exclusiones: number };
  destinatarios: {
    usuario: { id: number; nombre: string; apellido: string };
  }[];
  locales: { local: { id: number; nombre: string } }[];
};

function aTareaGlobalDto(
  tarea: TareaGlobalFila,
  clientesEmpresa: number,
  localesEmpresa: number,
  clientesAsignados = tarea._count.tareas,
  mostrarDestinatarios = true,
  editable = true,
): TareaGlobalDto {
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    activo: tarea.activo,
    editable,
    alcance: tarea.alcance,
    alcanceLocales: tarea.alcanceLocales,
    destinatarios: mostrarDestinatarios
      ? tarea.destinatarios.map(({ usuario }) => ({
          id: usuario.id,
          nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        }))
      : [],
    locales: tarea.locales.map(({ local }) => local),
    usuariosAsignados: mostrarDestinatarios ? tarea.destinatarios.length : 0,
    usuariosExcluidos: mostrarDestinatarios ? tarea._count.exclusiones : 0,
    localesAsignados: tarea.locales.length,
    clientesAsignados,
    clientesEmpresa,
    localesEmpresa,
    createdAt: tarea.createdAt.toISOString(),
    updatedAt: tarea.updatedAt.toISOString(),
  };
}

@Injectable()
export class TareasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  private usuarioActual(usuarioId: number): Promise<UsuarioOperacionesCampo> {
    return this.accesoCampo.usuario(usuarioId, [PAGINA_TAREAS]);
  }

  private async exigirGestor(
    usuarioId: number,
  ): Promise<UsuarioOperacionesCampo> {
    const usuario = await this.usuarioActual(usuarioId);
    if (!usuario.esGestor) {
      throw new ForbiddenException(
        'Solo un Supervisor o gestor puede administrar tareas',
      );
    }
    return usuario;
  }

  private duplicado(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe una tarea con ese título');
    }
    throw error;
  }

  private esGestorImpulsadores(usuario: UsuarioOperacionesCampo): boolean {
    return (
      usuario.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR ||
      usuario.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR
    );
  }

  private filtroListadoGestor(
    usuario: UsuarioOperacionesCampo,
  ): Prisma.TareaGlobalWhereInput {
    if (usuario.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR) {
      return {
        OR: [
          { creadoPorId: usuario.id },
          { creadoPor: { is: { superiorId: usuario.id } } },
          { destinatarios: { some: { usuarioId: usuario.id } } },
          {
            destinatarios: {
              some: {
                usuario: {
                  OR: [
                    { superiorId: usuario.id },
                    { superior: { is: { superiorId: usuario.id } } },
                  ],
                },
              },
            },
          },
        ],
      };
    }
    if (usuario.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR) {
      return {
        OR: [
          { creadoPorId: usuario.id },
          { destinatarios: { some: { usuarioId: usuario.id } } },
          {
            destinatarios: {
              some: { usuario: { superiorId: usuario.id } },
            },
          },
          {
            alcance: AlcanceTareaDto.TODOS,
            creadoPor: {
              is: { subordinados: { some: { id: usuario.id } } },
            },
          },
        ],
      };
    }
    return {};
  }

  private async exigirEditable(
    tareaId: number,
    usuario: UsuarioOperacionesCampo,
  ): Promise<void> {
    const tarea = await this.prisma.tareaGlobal.findFirst({
      where: {
        id: tareaId,
        empresaId: usuario.empresaId,
        ...(this.esGestorImpulsadores(usuario)
          ? { creadoPorId: usuario.id }
          : {}),
      },
      select: { id: true },
    });
    if (!tarea) {
      throw new NotFoundException('La tarea no existe');
    }
  }

  async listar(
    usuarioId: number,
    query: ListarTareasGlobalesDto,
  ): Promise<RespuestaPaginada<TareaGlobalDto>> {
    const usuario = await this.usuarioActual(usuarioId);
    const where: Prisma.TareaGlobalWhereInput = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor
        ? this.filtroListadoGestor(usuario)
        : {
            activo: true,
            ...filtroTareaGlobalVisiblePara(usuario),
          }),
    };
    const whereClientes = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor
        ? {}
        : {
            activo: true,
            locales: {
              some: { usuarioId: usuario.id, activo: true },
            },
          }),
    };
    const whereLocales = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor ? {} : { usuarioId: usuario.id, activo: true }),
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, tareas, clientesEmpresa, localesEmpresa] = await Promise.all([
      this.prisma.tareaGlobal.count({ where }),
      this.prisma.tareaGlobal.findMany({
        where,
        select: SELECT_TAREA_GLOBAL,
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.cliente.count({ where: whereClientes }),
      this.prisma.local.count({ where: whereLocales }),
    ]);
    return respuestaPaginada(
      tareas.map((tarea) =>
        aTareaGlobalDto(
          tarea,
          clientesEmpresa,
          localesEmpresa,
          usuario.esGestor ? tarea._count.tareas : clientesEmpresa,
          usuario.esGestor,
          !this.esGestorImpulsadores(usuario) ||
            tarea.creadoPorId === usuario.id,
        ),
      ),
      total,
      page,
      limit,
    );
  }

  async crear(
    usuarioId: number,
    dto: CrearTareaGlobalDto,
  ): Promise<TareaGlobalDto> {
    const usuario = await this.exigirGestor(usuarioId);
    const alcanceSolicitado = dto.alcance ?? AlcanceTareaDto.TODOS;
    const { alcance, destinatarios } = await this.resolverDestinatarios(
      usuario,
      alcanceSolicitado,
      dto.usuarioIds ?? [],
    );
    const alcanceLocales = dto.alcanceLocales ?? AlcanceTareaDto.TODOS;
    const locales = await this.resolverLocales(
      usuario,
      alcanceLocales,
      dto.localIds ?? [],
    );
    const cantidad = await this.prisma.tareaGlobal.count({
      where: { empresaId: usuario.empresaId },
    });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El checklist llegó al máximo de 100 tareas',
      );
    }

    const tareaId = await this.prisma
      .$transaction(async (tx) => {
        let orden = dto.orden;
        if (orden === undefined) {
          const agregado = await tx.tareaGlobal.aggregate({
            where: { empresaId: usuario.empresaId },
            _max: { orden: true },
          });
          orden = (agregado._max.orden ?? -1) + 1;
        }
        const tarea = await tx.tareaGlobal.create({
          data: {
            empresaId: usuario.empresaId,
            creadoPorId: usuario.id,
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            requiereFoto: dto.requiereFoto ?? false,
            alcance,
            alcanceLocales,
            orden,
            destinatarios: {
              create: destinatarios.map((destinatarioId) => ({
                usuarioId: destinatarioId,
              })),
            },
            locales: {
              create: locales.map((localId) => ({ localId })),
            },
          },
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            requiereFoto: true,
            orden: true,
            activo: true,
            alcance: true,
            alcanceLocales: true,
          },
        });
        const clientes = await tx.cliente.findMany({
          where: { empresaId: usuario.empresaId },
          select: { id: true },
        });
        if (clientes.length > 0) {
          await tx.tareaCliente.createMany({
            data: clientes.map((cliente) => ({
              clienteId: cliente.id,
              tareaGlobalId: tarea.id,
              titulo: tarea.titulo,
              descripcion: tarea.descripcion,
              requiereFoto: tarea.requiereFoto,
              orden: tarea.orden,
              activo: tarea.activo,
            })),
            skipDuplicates: true,
          });
        }
        return tarea.id;
      })
      .catch((error: unknown) => this.duplicado(error));
    return this.detalleDto(tareaId, usuario.empresaId);
  }

  async actualizar(
    usuarioId: number,
    tareaId: number,
    dto: ActualizarTareaGlobalDto,
  ): Promise<TareaGlobalDto> {
    const usuario = await this.exigirGestor(usuarioId);
    await this.exigirEditable(tareaId, usuario);
    const actual = await this.prisma.tareaGlobal.findUnique({
      where: { id: tareaId },
      select: {
        alcance: true,
        alcanceLocales: true,
        destinatarios: { select: { usuarioId: true }, take: 200 },
        locales: { select: { localId: true }, take: 200 },
      },
    });
    if (!actual) throw new NotFoundException('La tarea no existe');
    const alcanceSolicitado = dto.alcance ?? actual.alcance;
    const { alcance, destinatarios } = await this.resolverDestinatarios(
      usuario,
      alcanceSolicitado,
      dto.usuarioIds ?? actual.destinatarios.map(({ usuarioId }) => usuarioId),
    );
    const alcanceLocales = dto.alcanceLocales ?? actual.alcanceLocales;
    const locales = await this.resolverLocales(
      usuario,
      alcanceLocales,
      dto.localIds ?? actual.locales.map(({ localId }) => localId),
    );
    await this.prisma
      .$transaction(async (tx) => {
        const tarea = await tx.tareaGlobal.update({
          where: { id: tareaId },
          data: {
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            requiereFoto: dto.requiereFoto,
            alcance,
            alcanceLocales,
            orden: dto.orden,
            activo: dto.activo,
          },
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            requiereFoto: true,
            orden: true,
            activo: true,
          },
        });
        await tx.tareaGlobalUsuario.deleteMany({
          where: { tareaGlobalId: tarea.id },
        });
        if (destinatarios.length > 0) {
          await tx.tareaGlobalUsuario.createMany({
            data: destinatarios.map((destinatarioId) => ({
              tareaGlobalId: tarea.id,
              usuarioId: destinatarioId,
            })),
          });
          await tx.tareaGlobalExclusionUsuario.deleteMany({
            where: {
              tareaGlobalId: tarea.id,
              usuarioId: { in: destinatarios },
            },
          });
        }
        await tx.tareaGlobalLocal.deleteMany({
          where: { tareaGlobalId: tarea.id },
        });
        if (locales.length > 0) {
          await tx.tareaGlobalLocal.createMany({
            data: locales.map((localId) => ({
              tareaGlobalId: tarea.id,
              localId,
            })),
          });
        }
        await tx.tareaCliente.updateMany({
          where: { tareaGlobalId: tarea.id },
          data: {
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            requiereFoto: tarea.requiereFoto,
            orden: tarea.orden,
            activo: tarea.activo,
          },
        });
        const clientes = await tx.cliente.findMany({
          where: { empresaId: usuario.empresaId },
          select: { id: true },
        });
        if (clientes.length > 0) {
          await tx.tareaCliente.createMany({
            data: clientes.map((cliente) => ({
              clienteId: cliente.id,
              tareaGlobalId: tarea.id,
              titulo: tarea.titulo,
              descripcion: tarea.descripcion,
              requiereFoto: tarea.requiereFoto,
              orden: tarea.orden,
              activo: tarea.activo,
            })),
            skipDuplicates: true,
          });
        }
      })
      .catch((error: unknown) => this.duplicado(error));
    return this.detalleDto(tareaId, usuario.empresaId);
  }

  async eliminar(
    usuarioId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: true }> {
    const usuario = await this.exigirGestor(usuarioId);
    await this.exigirEditable(tareaId, usuario);
    await this.prisma.$transaction([
      this.prisma.tareaGlobal.update({
        where: { id: tareaId },
        data: { activo: false },
      }),
      this.prisma.tareaCliente.updateMany({
        where: { tareaGlobalId: tareaId },
        data: { activo: false },
      }),
    ]);
    return { ok: true, desactivada: true };
  }

  async quitarTodasDeUsuario(
    usuarioId: number,
    destinatarioId: number,
  ): Promise<TareasQuitadasUsuarioDto> {
    const gestor = await this.exigirGestor(usuarioId);
    await this.accesoCampo.validarOperativosDelGestor(gestor, [destinatarioId]);
    const destinatario = await this.prisma.usuario.findFirst({
      where: {
        id: destinatarioId,
        empresaId: gestor.empresaId,
        isActive: true,
      },
      select: {
        id: true,
        rol: { select: { descripcion: true } },
      },
    });
    if (!destinatario) {
      throw new NotFoundException('El usuario no pertenece a tu equipo');
    }

    const tareasQuitadas = await this.prisma.$transaction(async (tx) => {
      const tareas = await tx.tareaGlobal.findMany({
        where: {
          empresaId: gestor.empresaId,
          ...filtroTareaGlobalVisiblePara({
            id: destinatario.id,
            rolDescripcion: destinatario.rol?.descripcion ?? null,
          }),
        },
        select: { id: true },
        take: MAX_TAREAS_POR_LOCAL,
      });
      const tareaIds = tareas.map(({ id }) => id);
      let tareasGlobalesQuitadas = 0;
      if (tareaIds.length > 0) {
        await tx.tareaGlobalUsuario.deleteMany({
          where: {
            usuarioId: destinatario.id,
            tareaGlobalId: { in: tareaIds },
          },
        });
        const exclusionesGlobales =
          await tx.tareaGlobalExclusionUsuario.createMany({
            data: tareaIds.map((tareaGlobalId) => ({
              tareaGlobalId,
              usuarioId: destinatario.id,
              excluidoPorId: gestor.id,
            })),
            skipDuplicates: true,
          });
        tareasGlobalesQuitadas = exclusionesGlobales.count;
      }
      const tareasLocalesQuitadas = await tx.$executeRaw(Prisma.sql`
        INSERT INTO "tareas_cliente_exclusion_usuario" (
          "tarea_cliente_id", "usuario_id", "excluido_por_id", "created_at"
        )
        SELECT DISTINCT
          tarea."id", ${destinatario.id}, ${gestor.id}, CURRENT_TIMESTAMP
        FROM "tareas_cliente" AS tarea
        INNER JOIN "clientes" AS cliente
          ON cliente."id" = tarea."cliente_id"
        INNER JOIN "locales" AS local
          ON local."cliente_id" = cliente."id"
        WHERE tarea."tarea_global_id" IS NULL
          AND cliente."empresa_id" = ${gestor.empresaId}
          AND local."usuario_id" = ${destinatario.id}
          AND local."activo" = true
        ON CONFLICT ("tarea_cliente_id", "usuario_id") DO NOTHING
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM "visita_tareas" AS visita_tarea
        USING "visitas" AS visita, "tareas_cliente" AS tarea
        WHERE visita_tarea."visita_id" = visita."id"
          AND visita_tarea."tarea_id" = tarea."id"
          AND visita."usuario_id" = ${destinatario.id}
          AND visita."completada_en" IS NULL
          AND visita_tarea."completada" = false
          AND visita_tarea."comentario" IS NULL
          AND visita_tarea."foto" IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM "novedades_tarea" AS novedad
            WHERE novedad."visita_tarea_id" = visita_tarea."id"
          )
          AND (
            EXISTS (
              SELECT 1
              FROM "tareas_globales_exclusion_usuario" AS exclusion_global
              WHERE exclusion_global."tarea_global_id" = tarea."tarea_global_id"
                AND exclusion_global."usuario_id" = ${destinatario.id}
            )
            OR EXISTS (
              SELECT 1
              FROM "tareas_cliente_exclusion_usuario" AS exclusion_cliente
              WHERE exclusion_cliente."tarea_cliente_id" = tarea."id"
                AND exclusion_cliente."usuario_id" = ${destinatario.id}
            )
          )
      `);
      return tareasGlobalesQuitadas + Number(tareasLocalesQuitadas);
    });

    return {
      ok: true,
      usuarioId: destinatario.id,
      tareasQuitadas,
    };
  }

  private async detalleDto(
    tareaId: number,
    empresaId: number,
  ): Promise<TareaGlobalDto> {
    const [tarea, clientesEmpresa, localesEmpresa] = await Promise.all([
      this.prisma.tareaGlobal.findFirst({
        where: { id: tareaId, empresaId },
        select: SELECT_TAREA_GLOBAL,
      }),
      this.prisma.cliente.count({ where: { empresaId } }),
      this.prisma.local.count({ where: { empresaId } }),
    ]);
    if (!tarea) throw new NotFoundException('La tarea no existe');
    return aTareaGlobalDto(tarea, clientesEmpresa, localesEmpresa);
  }

  private async resolverDestinatarios(
    gestor: UsuarioOperacionesCampo,
    alcance: AlcanceTareaDto | 'TODOS' | 'SELECCIONADOS',
    usuarioIds: number[],
  ): Promise<{
    alcance: AlcanceTareaDto | 'TODOS' | 'SELECCIONADOS';
    destinatarios: number[];
  }> {
    if (alcance === AlcanceTareaDto.TODOS) {
      return { alcance, destinatarios: [] };
    }
    if (usuarioIds.length === 0) {
      throw new BadRequestException(
        'Elegí al menos un impulsador para esta tarea',
      );
    }
    return {
      alcance,
      destinatarios: await this.accesoCampo.validarOperativosDelGestor(
        gestor,
        usuarioIds,
      ),
    };
  }

  private async resolverLocales(
    gestor: UsuarioOperacionesCampo,
    alcance: AlcanceTareaDto | 'TODOS' | 'SELECCIONADOS',
    localIds: number[],
  ): Promise<number[]> {
    if (alcance === AlcanceTareaDto.TODOS) return [];
    const ids = [...new Set(localIds)];
    if (ids.length === 0) {
      throw new BadRequestException('Elegí al menos un local para esta tarea');
    }
    const esJerarquiaImpulsadores =
      gestor.rolDescripcion?.endsWith('.impulsador') ?? false;
    const alcanceEquipo = esJerarquiaImpulsadores
      ? await this.accesoCampo.filtroRepositoresDelSupervisor(gestor)
      : null;
    const encontrados = await this.prisma.local.findMany({
      where: {
        id: { in: ids },
        empresaId: gestor.empresaId,
        ...(alcanceEquipo ? { usuario: { is: alcanceEquipo } } : {}),
      },
      select: { id: true },
      take: 200,
    });
    if (encontrados.length !== ids.length) {
      throw new NotFoundException('Algún local no pertenece a tu equipo');
    }
    return ids;
  }
}
