import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsignarModuloDto } from './dto/asignacion.dto';
import type { AsignacionEmpresaDto } from './interfaces/asignacion.interface';

@Injectable()
export class AsignacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Qué módulos/páginas tiene habilitada una empresa (para pintar el ABM)
  async deEmpresa(empresaId: number): Promise<AsignacionEmpresaDto> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('La empresa no existe');
    }
    const [modulos, paginas] = await Promise.all([
      this.prisma.empresaModulo.findMany({ where: { empresaId } }),
      this.prisma.empresaPagina.findMany({
        where: { empresaId },
        include: { pagina: { select: { moduloId: true } } },
      }),
    ]);

    return {
      empresaId,
      modulos: modulos.map((m) => ({
        moduloId: m.moduloId,
        todasLasPaginas: m.todasLasPaginas,
        paginaIds: paginas
          .filter((p) => p.pagina.moduloId === m.moduloId)
          .map((p) => p.paginaId),
      })),
    };
  }

  // Habilita (o actualiza) un módulo para una empresa, con sus páginas
  async asignarModulo(dto: AsignarModuloDto): Promise<AsignacionEmpresaDto> {
    const [empresa, modulo] = await Promise.all([
      this.prisma.empresa.findUnique({
        where: { id: dto.empresaId },
        select: { id: true },
      }),
      this.prisma.modulo.findUnique({
        where: { id: dto.moduloId },
        select: { id: true },
      }),
    ]);
    if (!empresa) {
      throw new NotFoundException('La empresa no existe');
    }
    if (!modulo) {
      throw new NotFoundException('El módulo no existe');
    }

    // Regla anti fail-open: enviar paginaIds implica restringir. Nunca conceder
    // "todas las páginas" por accidente al omitir el flag con páginas presentes.
    const enviaPaginas =
      Array.isArray(dto.paginaIds) && dto.paginaIds.length > 0;
    if (dto.todasLasPaginas === true && enviaPaginas) {
      throw new BadRequestException(
        'No se pueden enviar paginaIds cuando todasLasPaginas es true',
      );
    }
    const todasLasPaginas = dto.todasLasPaginas ?? !enviaPaginas;
    const paginaIds = todasLasPaginas ? [] : (dto.paginaIds ?? []);

    // Si son páginas específicas, deben pertenecer al módulo
    if (paginaIds.length > 0) {
      const validas = await this.prisma.pagina.count({
        where: { id: { in: paginaIds }, moduloId: dto.moduloId },
      });
      if (validas !== paginaIds.length) {
        throw new BadRequestException(
          'Alguna página no pertenece al módulo indicado',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.empresaModulo.upsert({
        where: {
          empresaId_moduloId: {
            empresaId: dto.empresaId,
            moduloId: dto.moduloId,
          },
        },
        create: {
          empresaId: dto.empresaId,
          moduloId: dto.moduloId,
          todasLasPaginas,
        },
        update: { todasLasPaginas },
      });

      // Reemplaza las páginas específicas de ese módulo para la empresa
      const paginasDelModulo = await tx.pagina.findMany({
        where: { moduloId: dto.moduloId },
        select: { id: true },
      });
      const idsDelModulo = paginasDelModulo.map((p) => p.id);
      await tx.empresaPagina.deleteMany({
        where: { empresaId: dto.empresaId, paginaId: { in: idsDelModulo } },
      });
      if (paginaIds.length > 0) {
        await tx.empresaPagina.createMany({
          data: paginaIds.map((paginaId) => ({
            empresaId: dto.empresaId,
            paginaId,
          })),
        });
      }
    });

    return this.deEmpresa(dto.empresaId);
  }

  // Quita un módulo de una empresa (y sus páginas específicas)
  async quitarModulo(
    empresaId: number,
    moduloId: number,
  ): Promise<AsignacionEmpresaDto> {
    const existe = await this.prisma.empresaModulo.findUnique({
      where: { empresaId_moduloId: { empresaId, moduloId } },
    });
    if (!existe) {
      throw new NotFoundException('La empresa no tiene ese módulo habilitado');
    }
    const paginasDelModulo = await this.prisma.pagina.findMany({
      where: { moduloId },
      select: { id: true },
    });
    await this.prisma.$transaction([
      this.prisma.empresaPagina.deleteMany({
        where: {
          empresaId,
          paginaId: { in: paginasDelModulo.map((p) => p.id) },
        },
      }),
      this.prisma.empresaModulo.delete({
        where: { empresaId_moduloId: { empresaId, moduloId } },
      }),
    ]);
    return this.deEmpresa(empresaId);
  }
}
