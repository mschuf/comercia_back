import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Ejecutable } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarEjecutableDto,
  CrearEjecutableDto,
} from './dto/ejecutable.dto';
import type { EjecutableDto } from './interfaces/plataforma.interface';

@Injectable()
export class EjecutablesService {
  constructor(private readonly prisma: PrismaService) {}

  // Conexiones para el <select> del ABM: solo id + nombre (nunca la password_db)
  async listarConexiones(): Promise<{ id: number; nombre: string }[]> {
    return this.prisma.conexion.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(dto: CrearEjecutableDto): Promise<EjecutableDto> {
    const pagina = await this.prisma.pagina.findUnique({
      where: { id: dto.paginaId },
      select: { id: true },
    });
    if (!pagina) {
      throw new NotFoundException('La página no existe');
    }
    await this.validarConexion(dto.conexionId);

    const ejecutable = await this.prisma.ejecutable.create({
      data: {
        paginaId: dto.paginaId,
        nombre: dto.nombre,
        tipo: dto.tipo,
        motor: dto.motor,
        conexionId: dto.conexionId ?? null,
        sentencia: dto.sentencia,
        orden: dto.orden ?? 0,
        activo: dto.activo ?? true,
      },
    });
    return this.aDto(ejecutable);
  }

  async actualizar(
    id: number,
    dto: ActualizarEjecutableDto,
  ): Promise<EjecutableDto> {
    await this.obtener(id);
    if (dto.conexionId !== undefined) {
      await this.validarConexion(dto.conexionId);
    }
    const ejecutable = await this.prisma.ejecutable.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        tipo: dto.tipo,
        motor: dto.motor,
        conexionId: dto.conexionId,
        sentencia: dto.sentencia,
        orden: dto.orden,
        activo: dto.activo,
      },
    });
    return this.aDto(ejecutable);
  }

  async eliminar(id: number): Promise<{ ok: true }> {
    await this.obtener(id);
    await this.prisma.ejecutable.delete({ where: { id } });
    return { ok: true };
  }

  private async obtener(id: number) {
    const ejecutable = await this.prisma.ejecutable.findUnique({
      where: { id },
    });
    if (!ejecutable) {
      throw new NotFoundException('El ejecutable no existe');
    }
    return ejecutable;
  }

  private async validarConexion(conexionId: number | null | undefined) {
    if (conexionId === null || conexionId === undefined) {
      return;
    }
    const conexion = await this.prisma.conexion.findUnique({
      where: { id: conexionId },
      select: { id: true },
    });
    if (!conexion) {
      throw new BadRequestException('La conexión indicada no existe');
    }
  }

  private aDto(e: Ejecutable): EjecutableDto {
    return {
      id: e.id,
      nombre: e.nombre,
      tipo: e.tipo,
      motor: e.motor,
      conexionId: e.conexionId,
      sentencia: e.sentencia,
      orden: e.orden,
      activo: e.activo,
    };
  }
}
