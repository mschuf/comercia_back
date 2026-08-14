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
import { AccesoOperacionesCampoService } from '../impulsador/acceso-operaciones-campo.service';
import {
  MAX_TAREAS_POR_LOCAL,
  PAGINA_TAREAS,
} from '../impulsador/impulsador.constants';
import type { UsuarioOperacionesCampo } from '../impulsador/interfaces/usuario-operaciones-campo.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  filtroAlcanceLocalTarea,
  filtroTareaVisiblePara,
} from '../tareas/utils/visibilidad-tarea';
import {
  ActualizarTareaLocalDto,
  CrearTareaLocalDto,
} from './dto/tarea-local.dto';
import type { TareaLocalDto } from './interfaces/tarea-local.interface';
import { aTareaLocalDto, SELECT_TAREA_LOCAL } from './utils/tarea-local';

@Injectable()
export class TareasLocalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  private usuarioActual(usuarioId: number): Promise<UsuarioOperacionesCampo> {
    return this.accesoCampo.usuario(usuarioId, [PAGINA_TAREAS]);
  }

  private async clienteDeEmpresa(
    clienteId: number,
    empresaId: number,
  ): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { empresaId: true },
    });
    if (!cliente || cliente.empresaId !== empresaId) {
      throw new NotFoundException('El cliente no existe');
    }
  }

  private alcanceCliente(
    clienteId: number,
    usuario?: UsuarioOperacionesCampo,
  ): Prisma.TareaWhereInput {
    return {
      OR: [
        { alcanceLocales: 'TODOS' },
        { alcanceLocales: 'CLIENTE', clienteId },
        {
          alcanceLocales: 'SELECCIONADOS',
          locales: {
            some: {
              local: {
                clienteId,
                ...(usuario ? { usuarioId: usuario.id, activo: true } : {}),
              },
            },
          },
        },
      ],
    };
  }

  async listarCliente(
    usuarioId: number,
    clienteId: number,
  ): Promise<TareaLocalDto[]> {
    const actual = await this.usuarioActual(usuarioId);
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    if (!actual.esGestor) {
      const asignados = await this.prisma.local.count({
        where: { clienteId, usuarioId: actual.id, activo: true },
      });
      if (asignados === 0) throw new NotFoundException('El cliente no existe');
    }
    const tareas = await this.prisma.tarea.findMany({
      where: {
        empresaId: actual.empresaId,
        ...(actual.esGestor ? {} : { activo: true }),
        AND: [
          this.alcanceCliente(clienteId, actual.esGestor ? undefined : actual),
          ...(actual.esGestor ? [] : [filtroTareaVisiblePara(actual)]),
        ],
      },
      select: SELECT_TAREA_LOCAL,
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      take: MAX_TAREAS_POR_LOCAL,
    });
    return tareas.map(aTareaLocalDto);
  }

  async crearCliente(
    usuarioId: number,
    clienteId: number,
    dto: CrearTareaLocalDto,
  ): Promise<TareaLocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    await this.exigirCapacidad({
      empresaId: actual.empresaId,
      alcanceLocales: 'CLIENTE',
      clienteId,
    });
    const orden = await this.resolverOrden(dto.orden, {
      empresaId: actual.empresaId,
      alcanceLocales: 'CLIENTE',
      clienteId,
    });
    const tarea = await this.prisma.tarea.create({
      data: {
        empresaId: actual.empresaId,
        creadoPorId: actual.id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto ?? false,
        orden,
        ...this.alcanceUsuariosAlCrear(actual),
        alcanceLocales: 'CLIENTE',
        clienteId,
      },
      select: SELECT_TAREA_LOCAL,
    });
    return aTareaLocalDto(tarea);
  }

  async actualizarCliente(
    usuarioId: number,
    clienteId: number,
    tareaId: number,
    dto: ActualizarTareaLocalDto,
  ): Promise<TareaLocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    await this.tareaDeCliente(tareaId, clienteId, actual);
    const tarea = await this.prisma.tarea.update({
      where: { id: tareaId },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto,
        orden: dto.orden,
        activo: dto.activo,
      },
      select: SELECT_TAREA_LOCAL,
    });
    if (dto.activo !== undefined) {
      await this.actualizarEstadoEnVisitasAbiertas(tareaId, dto.activo);
    }
    return aTareaLocalDto(tarea);
  }

  async eliminarCliente(
    usuarioId: number,
    clienteId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: boolean }> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    await this.tareaDeCliente(tareaId, clienteId, actual);
    return this.eliminarTarea(tareaId);
  }

  private async localDeEmpresa(
    localId: number,
    actual: UsuarioOperacionesCampo,
  ): Promise<{ id: number; clienteId: number; usuarioId: number | null }> {
    const alcanceEquipo =
      actual.esGestor && actual.rolDescripcion?.endsWith('.impulsador')
        ? await this.accesoCampo.filtroRepositoresDelSupervisor(actual)
        : null;
    const local = await this.prisma.local.findFirst({
      where: {
        id: localId,
        empresaId: actual.empresaId,
        ...(actual.esGestor
          ? alcanceEquipo
            ? {
                OR: [
                  { usuario: { is: alcanceEquipo } },
                  { usuarioId: null, creadoPorId: actual.id },
                ],
              }
            : {}
          : { usuarioId: actual.id }),
      },
      select: { id: true, clienteId: true, usuarioId: true },
    });
    if (!local) throw new NotFoundException('El local no existe');
    return local;
  }

  async listar(usuarioId: number, localId: number): Promise<TareaLocalDto[]> {
    const actual = await this.usuarioActual(usuarioId);
    const local = await this.localDeEmpresa(localId, actual);
    const tareas = await this.prisma.tarea.findMany({
      where: {
        empresaId: actual.empresaId,
        ...(actual.esGestor ? {} : { activo: true }),
        AND: [
          filtroAlcanceLocalTarea(local),
          ...(actual.esGestor ? [] : [filtroTareaVisiblePara(actual)]),
        ],
      },
      select: SELECT_TAREA_LOCAL,
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
      take: MAX_TAREAS_POR_LOCAL,
    });
    return tareas.map(aTareaLocalDto);
  }

  async crear(
    usuarioId: number,
    localId: number,
    dto: CrearTareaLocalDto,
  ): Promise<TareaLocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    const local = await this.localDeEmpresa(localId, actual);
    const where = {
      empresaId: actual.empresaId,
      AND: [filtroAlcanceLocalTarea(local)],
    } satisfies Prisma.TareaWhereInput;
    await this.exigirCapacidad(where);
    const orden = await this.resolverOrden(dto.orden, where);
    const tarea = await this.prisma.tarea.create({
      data: {
        empresaId: actual.empresaId,
        creadoPorId: actual.id,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto ?? false,
        orden,
        ...this.alcanceUsuariosAlCrear(actual),
        alcanceLocales: 'SELECCIONADOS',
        locales: { create: { localId: local.id } },
      },
      select: SELECT_TAREA_LOCAL,
    });
    return aTareaLocalDto(tarea);
  }

  async actualizar(
    usuarioId: number,
    localId: number,
    tareaId: number,
    dto: ActualizarTareaLocalDto,
  ): Promise<TareaLocalDto> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    const local = await this.localDeEmpresa(localId, actual);
    await this.tareaDelLocal(tareaId, local.id, actual);
    const tarea = await this.prisma.tarea.update({
      where: { id: tareaId },
      data: {
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto,
        orden: dto.orden,
        activo: dto.activo,
      },
      select: SELECT_TAREA_LOCAL,
    });
    if (dto.activo !== undefined) {
      await this.actualizarEstadoEnVisitasAbiertas(tareaId, dto.activo);
    }
    return aTareaLocalDto(tarea);
  }

  async eliminar(
    usuarioId: number,
    localId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: boolean }> {
    const actual = await this.usuarioActual(usuarioId);
    this.exigirGestor(actual);
    const local = await this.localDeEmpresa(localId, actual);
    await this.tareaDelLocal(tareaId, local.id, actual);
    return this.eliminarTarea(tareaId);
  }

  private exigirGestor(actual: UsuarioOperacionesCampo): void {
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
  }

  private async tareaDeCliente(
    tareaId: number,
    clienteId: number,
    actual: UsuarioOperacionesCampo,
  ): Promise<void> {
    const tarea = await this.prisma.tarea.findFirst({
      where: {
        id: tareaId,
        empresaId: actual.empresaId,
        alcanceLocales: 'CLIENTE',
        clienteId,
        ...(actual.rolDescripcion?.endsWith('.impulsador')
          ? { creadoPorId: actual.id }
          : {}),
      },
      select: { id: true },
    });
    if (!tarea) throw new NotFoundException('La tarea no existe');
  }

  private async tareaDelLocal(
    tareaId: number,
    localId: number,
    actual: UsuarioOperacionesCampo,
  ): Promise<void> {
    const tarea = await this.prisma.tarea.findFirst({
      where: {
        id: tareaId,
        empresaId: actual.empresaId,
        alcanceLocales: 'SELECCIONADOS',
        locales: { some: { localId } },
        ...(actual.rolDescripcion?.endsWith('.impulsador')
          ? { creadoPorId: actual.id }
          : {}),
      },
      select: { id: true },
    });
    if (!tarea) throw new NotFoundException('La tarea no existe');
  }

  private async exigirCapacidad(where: Prisma.TareaWhereInput): Promise<void> {
    const cantidad = await this.prisma.tarea.count({ where });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El checklist llegó al máximo de 100 tareas',
      );
    }
  }

  private async resolverOrden(
    solicitado: number | undefined,
    where: Prisma.TareaWhereInput,
  ): Promise<number> {
    if (solicitado !== undefined) return solicitado;
    const agregado = await this.prisma.tarea.aggregate({
      where,
      _max: { orden: true },
    });
    return (agregado._max.orden ?? -1) + 1;
  }

  private alcanceUsuariosAlCrear(
    actual: UsuarioOperacionesCampo,
  ):
    | { alcanceUsuarios: 'EQUIPO_COMPLETO'; equipoRaizId: number }
    | { alcanceUsuarios: 'EMPRESA'; equipoRaizId: null } {
    if (
      actual.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR ||
      actual.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR
    ) {
      return {
        alcanceUsuarios: 'EQUIPO_COMPLETO',
        equipoRaizId: actual.id,
      };
    }
    return { alcanceUsuarios: 'EMPRESA', equipoRaizId: null };
  }

  private async actualizarEstadoEnVisitasAbiertas(
    tareaId: number,
    activa: boolean,
  ): Promise<void> {
    await this.prisma.visitaTarea.updateMany({
      where: { tareaId, visita: { completadaEn: null } },
      data: { activa },
    });
  }

  private async eliminarTarea(
    tareaId: number,
  ): Promise<{ ok: true; desactivada: boolean }> {
    const respuestas = await this.prisma.visitaTarea.count({
      where: { tareaId },
    });
    if (respuestas > 0) {
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
    await this.prisma.tarea.delete({ where: { id: tareaId } });
    return { ok: true, desactivada: false };
  }
}
