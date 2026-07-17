import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
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
  CrearTareaGlobalDto,
  ListarTareasGlobalesDto,
} from './dto/tarea-global.dto';
import type { TareaGlobalDto } from './interfaces/tarea-global.interface';

const SELECT_TAREA_GLOBAL = {
  id: true,
  titulo: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { tareas: true } },
} as const;

type TareaGlobalFila = {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { tareas: number };
};

function aTareaGlobalDto(
  tarea: TareaGlobalFila,
  clientesEmpresa: number,
  localesEmpresa: number,
  clientesAsignados = tarea._count.tareas,
): TareaGlobalDto {
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    activo: tarea.activo,
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

  private async exigirDeEmpresa(
    tareaId: number,
    empresaId: number,
  ): Promise<void> {
    const tarea = await this.prisma.tareaGlobal.findUnique({
      where: { id: tareaId },
      select: { empresaId: true },
    });
    if (!tarea || tarea.empresaId !== empresaId) {
      throw new NotFoundException('La tarea no existe');
    }
  }

  async listar(
    usuarioId: number,
    query: ListarTareasGlobalesDto,
  ): Promise<RespuestaPaginada<TareaGlobalDto>> {
    const usuario = await this.usuarioActual(usuarioId);
    const where = {
      empresaId: usuario.empresaId,
      ...(usuario.esGestor ? {} : { activo: true }),
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
            orden,
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
    await this.exigirDeEmpresa(tareaId, usuario.empresaId);
    await this.prisma
      .$transaction(async (tx) => {
        const tarea = await tx.tareaGlobal.update({
          where: { id: tareaId },
          data: {
            titulo: dto.titulo,
            descripcion: dto.descripcion,
            requiereFoto: dto.requiereFoto,
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
    await this.exigirDeEmpresa(tareaId, usuario.empresaId);
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
}
