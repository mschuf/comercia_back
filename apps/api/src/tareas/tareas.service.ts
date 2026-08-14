import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
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
  AlcanceLocalesTareaDto,
  AlcanceTareaDto,
  CrearTareaGlobalDto,
  ListarTareasGlobalesDto,
} from './dto/tarea-global.dto';
import type { TareaGlobalDto } from './interfaces/tarea-global.interface';
import type {
  AlcanceLocalesResuelto,
  AlcanceLocalesTareaValor,
  AlcanceUsuariosResuelto,
  AlcanceUsuariosTareaValor,
} from './interfaces/alcance-tarea.interface';
import type { TareasQuitadasUsuarioDto } from './interfaces/tareas-quitadas-usuario.interface';
import { aTareaGlobalDto, SELECT_TAREA_ADMIN } from './utils/tarea-dto';
import { filtroTareaVisiblePara } from './utils/visibilidad-tarea';

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

  private esGestorImpulsadores(usuario: UsuarioOperacionesCampo): boolean {
    return (
      usuario.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR ||
      usuario.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR
    );
  }

  private filtroListadoGestor(
    usuario: UsuarioOperacionesCampo,
  ): Prisma.TareaWhereInput {
    if (usuario.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR) {
      return {
        OR: [
          { creadoPorId: usuario.id },
          { creadoPor: { is: { superiorId: usuario.id } } },
          { equipoRaizId: usuario.id },
          { equipoRaiz: { is: { superiorId: usuario.id } } },
          {
            usuarios: {
              some: { usuarioId: usuario.id, efecto: 'INCLUIR' },
            },
          },
          {
            usuarios: {
              some: {
                efecto: 'INCLUIR',
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
          { equipoRaizId: usuario.id },
          {
            usuarios: {
              some: { usuarioId: usuario.id, efecto: 'INCLUIR' },
            },
          },
          {
            usuarios: {
              some: {
                efecto: 'INCLUIR',
                usuario: { superiorId: usuario.id },
              },
            },
          },
          {
            alcanceUsuarios: 'EQUIPO_COMPLETO',
            equipoRaiz: {
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
    const tarea = await this.prisma.tarea.findFirst({
      where: {
        id: tareaId,
        empresaId: usuario.empresaId,
        ...(this.esGestorImpulsadores(usuario)
          ? { creadoPorId: usuario.id }
          : {}),
      },
      select: { id: true },
    });
    if (!tarea) throw new NotFoundException('La tarea no existe');
  }

  async listar(
    usuarioId: number,
    query: ListarTareasGlobalesDto,
  ): Promise<RespuestaPaginada<TareaGlobalDto>> {
    const usuario = await this.usuarioActual(usuarioId);
    const where: Prisma.TareaWhereInput = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor
        ? this.filtroListadoGestor(usuario)
        : { activo: true, ...filtroTareaVisiblePara(usuario) }),
    };
    const whereClientes = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor
        ? {}
        : {
            activo: true,
            locales: { some: { usuarioId: usuario.id, activo: true } },
          }),
    };
    const whereLocales = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor ? {} : { usuarioId: usuario.id, activo: true }),
    };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, tareas, clientesEmpresa, localesEmpresa] = await Promise.all([
      this.prisma.tarea.count({ where }),
      this.prisma.tarea.findMany({
        where,
        select: SELECT_TAREA_ADMIN,
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
    const gestor = await this.exigirGestor(usuarioId);
    const alcanceUsuarios = await this.resolverAlcanceUsuarios(
      gestor,
      dto.alcance ?? AlcanceTareaDto.TODOS,
      dto.usuarioIds ?? [],
      dto.equipoRaizId,
    );
    const alcanceLocales = await this.resolverAlcanceLocales(
      gestor,
      dto.alcanceLocales ?? AlcanceLocalesTareaDto.TODOS,
      dto.localIds ?? [],
      dto.clienteId,
    );
    const vigencia = this.resolverVigencia(dto.vigenteDesde, dto.vigenteHasta);
    const cantidad = await this.prisma.tarea.count({
      where: { empresaId: gestor.empresaId },
    });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El catálogo llegó al máximo de 100 tareas activas y archivadas',
      );
    }

    const tareaId = await this.prisma.$transaction(async (tx) => {
      let orden = dto.orden;
      if (orden === undefined) {
        const agregado = await tx.tarea.aggregate({
          where: { empresaId: gestor.empresaId },
          _max: { orden: true },
        });
        orden = (agregado._max.orden ?? -1) + 1;
      }
      const tarea = await tx.tarea.create({
        data: {
          empresaId: gestor.empresaId,
          creadoPorId: gestor.id,
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          requiereFoto: dto.requiereFoto ?? false,
          orden,
          alcanceUsuarios: alcanceUsuarios.alcanceUsuarios,
          equipoRaizId: alcanceUsuarios.equipoRaizId,
          alcanceLocales: alcanceLocales.alcanceLocales,
          clienteId: alcanceLocales.clienteId,
          ...vigencia,
          usuarios: {
            create: alcanceUsuarios.destinatarios.map((destinatarioId) => ({
              usuarioId: destinatarioId,
              efecto: 'INCLUIR',
              registradoPorId: gestor.id,
            })),
          },
          locales: {
            create: alcanceLocales.locales.map((localId) => ({ localId })),
          },
        },
        select: { id: true },
      });
      return tarea.id;
    });
    return this.detalleDto(tareaId, gestor.empresaId);
  }

  async actualizar(
    usuarioId: number,
    tareaId: number,
    dto: ActualizarTareaGlobalDto,
  ): Promise<TareaGlobalDto> {
    const gestor = await this.exigirGestor(usuarioId);
    await this.exigirEditable(tareaId, gestor);
    const actual = await this.prisma.tarea.findUnique({
      where: { id: tareaId },
      select: {
        alcanceUsuarios: true,
        equipoRaizId: true,
        alcanceLocales: true,
        clienteId: true,
        vigenteDesde: true,
        vigenteHasta: true,
        usuarios: {
          where: { efecto: 'INCLUIR' },
          select: { usuarioId: true },
          take: 200,
        },
        locales: { select: { localId: true }, take: 200 },
      },
    });
    if (!actual) throw new NotFoundException('La tarea no existe');

    const alcanceUsuarios = await this.resolverAlcanceUsuarios(
      gestor,
      dto.alcance ?? actual.alcanceUsuarios,
      dto.usuarioIds ?? actual.usuarios.map(({ usuarioId }) => usuarioId),
      dto.equipoRaizId ?? actual.equipoRaizId ?? undefined,
    );
    const alcanceLocales = await this.resolverAlcanceLocales(
      gestor,
      dto.alcanceLocales ?? actual.alcanceLocales,
      dto.localIds ?? actual.locales.map(({ localId }) => localId),
      dto.clienteId ?? actual.clienteId ?? undefined,
    );
    const vigencia = this.resolverVigencia(
      Object.hasOwn(dto, 'vigenteDesde')
        ? (dto.vigenteDesde ?? undefined)
        : actual.vigenteDesde?.toISOString(),
      Object.hasOwn(dto, 'vigenteHasta')
        ? (dto.vigenteHasta ?? undefined)
        : actual.vigenteHasta?.toISOString(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.tarea.update({
        where: { id: tareaId },
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          requiereFoto: dto.requiereFoto,
          orden: dto.orden,
          activo: dto.activo,
          alcanceUsuarios: alcanceUsuarios.alcanceUsuarios,
          equipoRaizId: alcanceUsuarios.equipoRaizId,
          alcanceLocales: alcanceLocales.alcanceLocales,
          clienteId: alcanceLocales.clienteId,
          ...vigencia,
        },
        select: { id: true },
      });
      await tx.tareaUsuario.deleteMany({
        where: { tareaId, efecto: 'INCLUIR' },
      });
      if (alcanceUsuarios.destinatarios.length > 0) {
        await tx.tareaUsuario.deleteMany({
          where: {
            tareaId,
            efecto: 'EXCLUIR',
            usuarioId: { in: alcanceUsuarios.destinatarios },
          },
        });
        await tx.tareaUsuario.createMany({
          data: alcanceUsuarios.destinatarios.map((destinatarioId) => ({
            tareaId,
            usuarioId: destinatarioId,
            efecto: 'INCLUIR',
            registradoPorId: gestor.id,
          })),
        });
      }
      await tx.tareaLocal.deleteMany({ where: { tareaId } });
      if (alcanceLocales.locales.length > 0) {
        await tx.tareaLocal.createMany({
          data: alcanceLocales.locales.map((localId) => ({ tareaId, localId })),
        });
      }
      if (dto.activo !== undefined) {
        await tx.visitaTarea.updateMany({
          where: { tareaId, visita: { completadaEn: null } },
          data: { activa: dto.activo },
        });
      }
    });
    return this.detalleDto(tareaId, gestor.empresaId);
  }

  async eliminar(
    usuarioId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: true }> {
    const gestor = await this.exigirGestor(usuarioId);
    await this.exigirEditable(tareaId, gestor);
    await this.prisma.$transaction([
      this.prisma.tarea.update({
        where: { id: tareaId },
        data: { activo: false },
        select: { id: true },
      }),
      this.prisma.visitaTarea.updateMany({
        where: { tareaId, visita: { completadaEn: null } },
        data: { activa: false },
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
      select: { id: true },
    });
    if (!destinatario) {
      throw new NotFoundException('El usuario no pertenece a tu equipo');
    }

    const tareas = await this.prisma.tarea.findMany({
      where: {
        empresaId: gestor.empresaId,
        activo: true,
        AND: [
          filtroTareaVisiblePara(destinatario),
          {
            OR: [
              { alcanceLocales: 'TODOS' },
              {
                alcanceLocales: 'CLIENTE',
                cliente: {
                  is: {
                    locales: {
                      some: { usuarioId: destinatario.id, activo: true },
                    },
                  },
                },
              },
              {
                alcanceLocales: 'SELECCIONADOS',
                locales: {
                  some: {
                    local: {
                      usuarioId: destinatario.id,
                      activo: true,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      select: { id: true },
      take: 5000,
    });
    const tareaIds = tareas.map(({ id }) => id);
    if (tareaIds.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.tareaUsuario.deleteMany({
          where: {
            tareaId: { in: tareaIds },
            usuarioId: destinatario.id,
            efecto: 'INCLUIR',
          },
        });
        await tx.tareaUsuario.createMany({
          data: tareaIds.map((tareaId) => ({
            tareaId,
            usuarioId: destinatario.id,
            efecto: 'EXCLUIR',
            registradoPorId: gestor.id,
          })),
          skipDuplicates: true,
        });
        await tx.visitaTarea.deleteMany({
          where: {
            tareaId: { in: tareaIds },
            visita: { usuarioId: destinatario.id, completadaEn: null },
            completada: false,
            comentario: null,
            foto: null,
            novedad: null,
          },
        });
      });
    }

    return {
      ok: true,
      usuarioId: destinatario.id,
      tareasQuitadas: tareaIds.length,
    };
  }

  private async detalleDto(
    tareaId: number,
    empresaId: number,
  ): Promise<TareaGlobalDto> {
    const [tarea, clientesEmpresa, localesEmpresa] = await Promise.all([
      this.prisma.tarea.findFirst({
        where: { id: tareaId, empresaId },
        select: SELECT_TAREA_ADMIN,
      }),
      this.prisma.cliente.count({ where: { empresaId } }),
      this.prisma.local.count({ where: { empresaId } }),
    ]);
    if (!tarea) throw new NotFoundException('La tarea no existe');
    return aTareaGlobalDto(tarea, clientesEmpresa, localesEmpresa);
  }

  private async resolverAlcanceUsuarios(
    gestor: UsuarioOperacionesCampo,
    solicitado: AlcanceTareaDto | AlcanceUsuariosTareaValor,
    usuarioIds: number[],
    equipoRaizId?: number,
  ): Promise<AlcanceUsuariosResuelto> {
    const alcanceUsuarios: AlcanceUsuariosTareaValor =
      solicitado === AlcanceTareaDto.TODOS
        ? this.esGestorImpulsadores(gestor)
          ? 'EQUIPO_COMPLETO'
          : 'EMPRESA'
        : solicitado;

    if (
      alcanceUsuarios === 'EMPRESA' &&
      gestor.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR
    ) {
      throw new ForbiddenException(
        'El team leader solo puede asignar tareas dentro de su equipo',
      );
    }
    if (alcanceUsuarios === 'SELECCIONADOS') {
      if (usuarioIds.length === 0) {
        throw new BadRequestException('Elegí al menos una persona');
      }
      return {
        alcanceUsuarios,
        equipoRaizId: null,
        destinatarios: await this.accesoCampo.validarOperativosDelGestor(
          gestor,
          usuarioIds,
        ),
      };
    }
    if (
      alcanceUsuarios === 'EQUIPO_DIRECTO' ||
      alcanceUsuarios === 'EQUIPO_COMPLETO'
    ) {
      return {
        alcanceUsuarios,
        equipoRaizId: await this.resolverEquipoRaiz(gestor, equipoRaizId),
        destinatarios: [],
      };
    }
    return { alcanceUsuarios, equipoRaizId: null, destinatarios: [] };
  }

  private async resolverEquipoRaiz(
    gestor: UsuarioOperacionesCampo,
    solicitado?: number,
  ): Promise<number> {
    const equipoRaizId = solicitado ?? gestor.id;
    if (equipoRaizId === gestor.id) return equipoRaizId;
    if (gestor.rolDescripcion !== ROL_SUPERVISOR_IMPULSADOR) {
      throw new ForbiddenException('No podés asignar desde otro equipo');
    }
    const teamleader = await this.prisma.usuario.findFirst({
      where: {
        id: equipoRaizId,
        empresaId: gestor.empresaId,
        superiorId: gestor.id,
        isActive: true,
        rol: { is: { descripcion: ROL_TEAMLEADER_IMPULSADOR } },
      },
      select: { id: true },
    });
    if (!teamleader) {
      throw new NotFoundException(
        'El equipo elegido no pertenece al supervisor',
      );
    }
    return teamleader.id;
  }

  private async resolverAlcanceLocales(
    gestor: UsuarioOperacionesCampo,
    alcanceLocales: AlcanceLocalesTareaDto | AlcanceLocalesTareaValor,
    localIds: number[],
    clienteId?: number,
  ): Promise<AlcanceLocalesResuelto> {
    if (alcanceLocales === 'TODOS') {
      return { alcanceLocales, clienteId: null, locales: [] };
    }
    if (alcanceLocales === 'CLIENTE') {
      if (!clienteId) throw new BadRequestException('Elegí un cliente');
      await this.validarClienteDelGestor(gestor, clienteId);
      return { alcanceLocales, clienteId, locales: [] };
    }
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
    return { alcanceLocales, clienteId: null, locales: ids };
  }

  private async validarClienteDelGestor(
    gestor: UsuarioOperacionesCampo,
    clienteId: number,
  ): Promise<void> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId: gestor.empresaId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('El cliente no existe');
    if (!this.esGestorImpulsadores(gestor)) return;

    const alcanceEquipo =
      await this.accesoCampo.filtroRepositoresDelSupervisor(gestor);
    const [total, permitidos] = await Promise.all([
      this.prisma.local.count({
        where: { clienteId, empresaId: gestor.empresaId, activo: true },
      }),
      this.prisma.local.count({
        where: {
          clienteId,
          empresaId: gestor.empresaId,
          activo: true,
          usuario: { is: alcanceEquipo },
        },
      }),
    ]);
    if (total === 0 || total !== permitidos) {
      throw new NotFoundException(
        'El cliente tiene locales fuera de tu equipo; elegí locales concretos',
      );
    }
  }

  private resolverVigencia(
    desde?: string | null,
    hasta?: string | null,
  ): { vigenteDesde: Date | null; vigenteHasta: Date | null } {
    const vigenteDesde = desde ? new Date(desde) : null;
    const vigenteHasta = hasta ? new Date(hasta) : null;
    if (
      vigenteDesde &&
      vigenteHasta &&
      vigenteHasta.getTime() < vigenteDesde.getTime()
    ) {
      throw new BadRequestException(
        'La fecha final no puede ser anterior a la fecha inicial',
      );
    }
    return { vigenteDesde, vigenteHasta };
  }
}
