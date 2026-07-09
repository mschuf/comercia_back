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
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
};

export const SELECT_TAREA_LOCAL = {
  id: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
} as const;

export function aTareaLocalDto(tarea: TareaLocalFila): TareaLocalDto {
  return {
    id: tarea.id,
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

  // El local debe ser de la empresa del usuario antes de tocar sus tareas.
  // Devuelve el asignado para chequear visibilidad del no gestor.
  private async localDeEmpresa(
    localId: number,
    empresaId: number,
  ): Promise<{ id: number; usuarioId: number | null }> {
    const local = await this.prisma.local.findUnique({
      where: { id: localId },
      select: { id: true, empresaId: true, usuarioId: true },
    });
    if (!local || local.empresaId !== empresaId) {
      throw new NotFoundException('El local no existe');
    }
    return { id: local.id, usuarioId: local.usuarioId };
  }

  // La tarea debe pertenecer al local ya validado contra la empresa
  private async tareaDelLocal(tareaId: number, localId: number): Promise<void> {
    const tarea = await this.prisma.tareaLocal.findUnique({
      where: { id: tareaId },
      select: { localId: true },
    });
    if (!tarea || tarea.localId !== localId) {
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
    const tareas = await this.prisma.tareaLocal.findMany({
      where: actual.esGestor ? { localId } : { localId, activo: true },
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
    await this.localDeEmpresa(localId, actual.empresaId);

    const cantidad = await this.prisma.tareaLocal.count({ where: { localId } });
    if (cantidad >= MAX_TAREAS_POR_LOCAL) {
      throw new BadRequestException(
        'El checklist llegó al máximo de 100 tareas',
      );
    }

    let orden = dto.orden;
    if (orden === undefined) {
      // Sin orden explícito la tarea va al final del checklist
      const agregado = await this.prisma.tareaLocal.aggregate({
        where: { localId },
        _max: { orden: true },
      });
      orden = (agregado._max.orden ?? -1) + 1;
    }

    const tarea = await this.prisma.tareaLocal.create({
      data: {
        localId,
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
    await this.localDeEmpresa(localId, actual.empresaId);
    await this.tareaDelLocal(tareaId, localId);

    const tarea = await this.prisma.tareaLocal.update({
      where: { id: tareaId },
      data: {
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
    await this.localDeEmpresa(localId, actual.empresaId);
    await this.tareaDelLocal(tareaId, localId);

    // Regla: si la tarea ya tiene respuestas de visitas, borrarla arrastraría
    // ese historial (VisitaTarea cae en cascada), así que solo se desactiva.
    // Sin respuestas, se borra físicamente.
    const respuestas = await this.prisma.visitaTarea.count({
      where: { tareaId },
    });
    if (respuestas > 0) {
      await this.prisma.tareaLocal.update({
        where: { id: tareaId },
        data: { activo: false },
      });
      return { ok: true, desactivada: true };
    }
    await this.prisma.tareaLocal.delete({ where: { id: tareaId } });
    return { ok: true, desactivada: false };
  }
}
