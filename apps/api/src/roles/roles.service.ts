import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  rangoPaginacion,
  respuestaPaginada,
  type PaginacionDto,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarRolDto, CrearRolDto } from './dto/rol.dto';
import type {
  RolAdminDto,
  RolAdminFila,
} from './interfaces/rol-admin.interface';

const SELECT_ROL_ADMIN = {
  id: true,
  descripcion: true,
  padre: { select: { id: true, descripcion: true } },
  _count: { select: { usuarios: true, hijos: true } },
} as const;

function aRolAdminDto(rol: RolAdminFila): RolAdminDto {
  return {
    id: rol.id,
    descripcion: rol.descripcion,
    padre: rol.padre,
    usuariosCount: rol._count.usuarios,
    hijosCount: rol._count.hijos,
  };
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: PaginacionDto): Promise<RespuestaPaginada<RolAdminDto>> {
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, roles] = await Promise.all([
      this.prisma.rol.count(),
      this.prisma.rol.findMany({
        select: SELECT_ROL_ADMIN,
        orderBy: [{ descripcion: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(roles.map(aRolAdminDto), total, page, limit);
  }

  private async validarPadre(
    rolId: number | null | undefined,
    rolActualId?: number,
  ): Promise<void> {
    if (rolId === undefined || rolId === null) return;
    if (rolId === rolActualId) {
      throw new BadRequestException('Un rol no puede ser su propio superior');
    }
    const padre = await this.prisma.rol.findUnique({
      where: { id: rolId },
      select: { id: true },
    });
    if (!padre) {
      throw new BadRequestException('El rol superior seleccionado no existe');
    }
  }

  async crear(dto: CrearRolDto): Promise<RolAdminDto> {
    await this.validarPadre(dto.rolId);
    const descripcion = dto.descripcion.trim();
    try {
      const rol = await this.prisma.rol.create({
        data: { descripcion, rolId: dto.rolId ?? null },
        select: SELECT_ROL_ADMIN,
      });
      return aRolAdminDto(rol);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un rol con esa descripción');
      }
      throw error;
    }
  }

  async actualizar(id: number, dto: ActualizarRolDto): Promise<RolAdminDto> {
    const existente = await this.prisma.rol.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existente) throw new NotFoundException('El rol no existe');
    await this.validarPadre(dto.rolId, id);
    try {
      const rol = await this.prisma.rol.update({
        where: { id },
        data: {
          descripcion: dto.descripcion?.trim(),
          rolId: dto.rolId,
        },
        select: SELECT_ROL_ADMIN,
      });
      return aRolAdminDto(rol);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un rol con esa descripción');
      }
      throw error;
    }
  }

  async eliminar(id: number): Promise<{ ok: true }> {
    const rol = await this.prisma.rol.findUnique({
      where: { id },
      select: { id: true, _count: { select: { usuarios: true, hijos: true } } },
    });
    if (!rol) throw new NotFoundException('El rol no existe');
    if (rol._count.usuarios > 0 || rol._count.hijos > 0) {
      throw new BadRequestException(
        'No se puede eliminar un rol que todavía está en uso',
      );
    }
    await this.prisma.rol.delete({ where: { id } });
    return { ok: true };
  }
}
