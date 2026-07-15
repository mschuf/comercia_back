import {
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
import { ConfigImpulsadorService } from '../impulsador/config-impulsador.service';
import { PAGINAS_IMPULSADOR } from '../impulsador/impulsador.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarClienteDto,
  CrearClienteDto,
  ListarClientesDto,
} from './dto/cliente.dto';
import type { ClienteDto } from './interfaces/cliente.interface';

const SELECT_CLIENTE = {
  id: true,
  nombre: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { locales: true } },
} as const;

type ClienteFila = {
  id: number;
  nombre: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count: { locales: number };
};

function aClienteDto(cliente: ClienteFila): ClienteDto {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    activo: cliente.activo,
    localesCount: cliente._count.locales,
    createdAt: cliente.createdAt.toISOString(),
    updatedAt: cliente.updatedAt.toISOString(),
  };
}

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigImpulsadorService,
  ) {}

  async listar(
    usuarioId: number,
    query: ListarClientesDto,
  ): Promise<RespuestaPaginada<ClienteDto>> {
    const usuario = await this.config.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    const where = {
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
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, clientes] = await Promise.all([
      this.prisma.cliente.count({ where }),
      this.prisma.cliente.findMany({
        where,
        select: SELECT_CLIENTE,
        orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(clientes.map(aClienteDto), total, page, limit);
  }

  private async exigirGestor(usuarioId: number) {
    const usuario = await this.config.usuarioImpulsador(
      usuarioId,
      PAGINAS_IMPULSADOR,
    );
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede administrar clientes');
    }
    return usuario;
  }

  private async clienteDeEmpresa(id: number, empresaId: number) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: {
        id: true,
        empresaId: true,
        _count: { select: { locales: true } },
      },
    });
    if (!cliente || cliente.empresaId !== empresaId) {
      throw new NotFoundException('El cliente no existe');
    }
    return cliente;
  }

  private duplicado(e: unknown): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException('Ya existe un cliente con ese nombre');
    }
    throw e;
  }

  async crear(usuarioId: number, dto: CrearClienteDto): Promise<ClienteDto> {
    const usuario = await this.exigirGestor(usuarioId);
    const cliente = await this.prisma
      .$transaction(async (tx) => {
        const creado = await tx.cliente.create({
          data: {
            empresaId: usuario.empresaId,
            creadoPorId: usuario.id,
            nombre: dto.nombre,
          },
          select: { id: true },
        });
        const tareas = await tx.tareaGlobal.findMany({
          where: { empresaId: usuario.empresaId },
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            requiereFoto: true,
            orden: true,
            activo: true,
          },
        });
        if (tareas.length > 0) {
          await tx.tareaCliente.createMany({
            data: tareas.map((tarea) => ({
              clienteId: creado.id,
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
        return tx.cliente.findUniqueOrThrow({
          where: { id: creado.id },
          select: SELECT_CLIENTE,
        });
      })
      .catch((e: unknown) => this.duplicado(e));
    return aClienteDto(cliente);
  }

  async actualizar(
    usuarioId: number,
    id: number,
    dto: ActualizarClienteDto,
  ): Promise<ClienteDto> {
    const usuario = await this.exigirGestor(usuarioId);
    await this.clienteDeEmpresa(id, usuario.empresaId);
    const cliente = await this.prisma.cliente
      .update({
        where: { id },
        data: {
          nombre: dto.nombre,
          activo: dto.activo,
        },
        select: SELECT_CLIENTE,
      })
      .catch((e: unknown) => this.duplicado(e));
    return aClienteDto(cliente);
  }

  async eliminar(usuarioId: number, id: number): Promise<{ ok: true }> {
    const usuario = await this.exigirGestor(usuarioId);
    const cliente = await this.clienteDeEmpresa(id, usuario.empresaId);
    if (cliente._count.locales > 0) {
      throw new ConflictException(
        'Eliminá primero los locales de este cliente para conservar el historial',
      );
    }
    await this.prisma.cliente.delete({ where: { id } });
    return { ok: true };
  }
}
