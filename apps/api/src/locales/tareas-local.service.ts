import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigImpulsadorService } from '../impulsador/config-impulsador.service';
import {
  MAX_TAREAS_POR_LOCAL,
  PAGINAS_IMPULSADOR,
} from '../impulsador/impulsador.constants';
import type { UsuarioImpulsador } from '../impulsador/interfaces/usuario-impulsador.interface';
import {
  ActualizarTareaLocalDto,
  CrearTareaLocalDto,
} from './dto/tarea-local.dto';
import type { TareaLocalDto } from './interfaces/tarea-local.interface';

type TareaLocalFila = {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
};

export const SELECT_TAREA_LOCAL = {
  id: true,
  titulo: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
} as const;

export function aTareaLocalDto(tarea: TareaLocalFila): TareaLocalDto {
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    activo: tarea.activo,
  };
}

@Injectable()
export class TareasLocalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configImpulsador: ConfigImpulsadorService,
  ) {}

  private usuarioActual(usuarioId: number): Promise<UsuarioImpulsador> {
    return this.configImpulsador.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
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
      if (asignados === 0) {
        throw new NotFoundException('El cliente no existe');
      }
    }
    const tareas = await this.prisma.tareaCliente.findMany({
      where: actual.esGestor ? { clienteId } : { clienteId, activo: true },
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
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    const cantidad = await this.prisma.tareaCliente.count({
      where: { clienteId },
    });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El checklist llegó al máximo de 100 tareas',
      );
    }
    let orden = dto.orden;
    if (orden === undefined) {
      const agregado = await this.prisma.tareaCliente.aggregate({
        where: { clienteId },
        _max: { orden: true },
      });
      orden = (agregado._max.orden ?? -1) + 1;
    }
    const tarea = await this.prisma.tareaCliente.create({
      data: {
        clienteId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto ?? false,
        orden,
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
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    await this.tareaDelCliente(tareaId, clienteId);
    const tarea = await this.prisma.tareaCliente.update({
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
    return aTareaLocalDto(tarea);
  }

  async eliminarCliente(
    usuarioId: number,
    clienteId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: boolean }> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    await this.clienteDeEmpresa(clienteId, actual.empresaId);
    await this.tareaDelCliente(tareaId, clienteId);
    const respuestas = await this.prisma.visitaTarea.count({
      where: { tareaId },
    });
    if (respuestas > 0) {
      await this.prisma.tareaCliente.update({
        where: { id: tareaId },
        data: { activo: false },
      });
      return { ok: true, desactivada: true };
    }
    await this.prisma.tareaCliente.delete({ where: { id: tareaId } });
    return { ok: true, desactivada: false };
  }

  // El local debe ser de la empresa del usuario antes de tocar sus tareas.
  // Devuelve el asignado para chequear visibilidad del no gestor.
  private async localDeEmpresa(
    localId: number,
    empresaId: number,
  ): Promise<{ id: number; clienteId: number; usuarioId: number | null }> {
    const local = await this.prisma.local.findUnique({
      where: { id: localId },
      select: { id: true, clienteId: true, empresaId: true, usuarioId: true },
    });
    if (!local || local.empresaId !== empresaId) {
      throw new NotFoundException('El local no existe');
    }
    return {
      id: local.id,
      clienteId: local.clienteId,
      usuarioId: local.usuarioId,
    };
  }

  // La tarea debe pertenecer al local ya validado contra la empresa
  private async tareaDelCliente(
    tareaId: number,
    clienteId: number,
  ): Promise<void> {
    const tarea = await this.prisma.tareaCliente.findUnique({
      where: { id: tareaId },
      select: { clienteId: true },
    });
    if (!tarea || tarea.clienteId !== clienteId) {
      throw new NotFoundException('La tarea no existe');
    }
  }

  // Gestor de la empresa del local o usuario asignado; el no gestor solo ve activas
  async listar(usuarioId: number, localId: number): Promise<TareaLocalDto[]> {
    const actual = await this.usuarioActual(usuarioId);
    const local = await this.localDeEmpresa(localId, actual.empresaId);
    if (!actual.esGestor && local.usuarioId !== actual.id) {
      throw new NotFoundException('El local no existe');
    }
    // Sin paginar (excepción a la regla): el checklist está acotado por
    // MAX_TAREAS_POR_LOCAL, así que el take fijo cubre el peor caso.
    const tareas = await this.prisma.tareaCliente.findMany({
      where: actual.esGestor
        ? { clienteId: local.clienteId }
        : { clienteId: local.clienteId, activo: true },
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
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    const local = await this.localDeEmpresa(localId, actual.empresaId);

    const cantidad = await this.prisma.tareaCliente.count({
      where: { clienteId: local.clienteId },
    });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El checklist llegó al máximo de 100 tareas',
      );
    }

    let orden = dto.orden;
    if (orden === undefined) {
      // Sin orden explícito la tarea va al final del checklist
      const agregado = await this.prisma.tareaCliente.aggregate({
        where: { clienteId: local.clienteId },
        _max: { orden: true },
      });
      orden = (agregado._max.orden ?? -1) + 1;
    }

    const tarea = await this.prisma.tareaCliente.create({
      data: {
        clienteId: local.clienteId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        requiereFoto: dto.requiereFoto ?? false,
        orden,
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
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    const local = await this.localDeEmpresa(localId, actual.empresaId);
    await this.tareaDelCliente(tareaId, local.clienteId);

    const tarea = await this.prisma.tareaCliente.update({
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
    return aTareaLocalDto(tarea);
  }

  async eliminar(
    usuarioId: number,
    localId: number,
    tareaId: number,
  ): Promise<{ ok: true; desactivada: boolean }> {
    const actual = await this.usuarioActual(usuarioId);
    if (!actual.esGestor) {
      throw new ForbiddenException('Solo un gestor puede editar el checklist');
    }
    const local = await this.localDeEmpresa(localId, actual.empresaId);
    await this.tareaDelCliente(tareaId, local.clienteId);

    // Regla: si la tarea ya tiene respuestas de visitas, borrarla arrastraría
    // ese historial (VisitaTarea cae en cascada), así que solo se desactiva.
    // Sin respuestas, se borra físicamente.
    const respuestas = await this.prisma.visitaTarea.count({
      where: { tareaId },
    });
    if (respuestas > 0) {
      await this.prisma.tareaCliente.update({
        where: { id: tareaId },
        data: { activo: false },
      });
      return { ok: true, desactivada: true };
    }
    await this.prisma.tareaCliente.delete({ where: { id: tareaId } });
    return { ok: true, desactivada: false };
  }
}
