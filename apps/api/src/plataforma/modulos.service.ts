import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  type Ejecutable,
  type Modulo,
  type Pagina,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActualizarModuloDto, CrearModuloDto } from './dto/modulo.dto';
import { ActualizarPaginaDto, CrearPaginaDto } from './dto/pagina.dto';
import type { ModuloDto, PaginaDto } from './interfaces/plataforma.interface';

@Injectable()
export class ModulosService {
  constructor(private readonly prisma: PrismaService) {}

  // Roles para los selectores de visibilidad del ABM (solo id + descripción)
  async listarRoles(): Promise<{ id: number; descripcion: string }[]> {
    return this.prisma.rol.findMany({
      select: { id: true, descripcion: true },
      orderBy: { descripcion: 'asc' },
    });
  }

  // Lista completa con páginas y ejecutables anidados: es la vista del ABM del
  // superadmin (pocas decenas de filas, no necesita paginación).
  async listar(): Promise<ModuloDto[]> {
    const modulos = await this.prisma.modulo.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      include: {
        paginas: {
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
          include: {
            ejecutables: { orderBy: [{ orden: 'asc' }, { nombre: 'asc' }] },
          },
        },
      },
    });
    return modulos.map((m) => this.aModuloDto(m));
  }

  async crearModulo(dto: CrearModuloDto): Promise<ModuloDto> {
    const modulo = await this.prisma.modulo
      .create({
        data: {
          nombre: dto.nombre,
          ruta: dto.ruta,
          icono: dto.icono ?? null,
          orden: dto.orden ?? 0,
          activo: dto.activo ?? true,
        },
      })
      .catch((e: unknown) => {
        throw this.mapErrorRuta(e, 'Ya existe un módulo con esa ruta');
      });
    return this.aModuloDto({ ...modulo, paginas: [] });
  }

  async actualizarModulo(
    id: number,
    dto: ActualizarModuloDto,
  ): Promise<ModuloDto> {
    await this.obtenerModulo(id);
    const modulo = await this.prisma.modulo
      .update({
        where: { id },
        data: {
          nombre: dto.nombre,
          ruta: dto.ruta,
          icono: dto.icono,
          orden: dto.orden,
          activo: dto.activo,
        },
        include: {
          paginas: {
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
            include: { ejecutables: true },
          },
        },
      })
      .catch((e: unknown) => {
        throw this.mapErrorRuta(e, 'Ya existe un módulo con esa ruta');
      });
    return this.aModuloDto(modulo);
  }

  async eliminarModulo(id: number): Promise<{ ok: true }> {
    await this.obtenerModulo(id);
    // onDelete: Cascade borra páginas y ejecutables del módulo
    await this.prisma.modulo.delete({ where: { id } });
    return { ok: true };
  }

  async crearPagina(dto: CrearPaginaDto): Promise<PaginaDto> {
    await this.obtenerModulo(dto.moduloId);
    const pagina = await this.prisma.pagina
      .create({
        data: {
          moduloId: dto.moduloId,
          nombre: dto.nombre,
          ruta: dto.ruta,
          icono: dto.icono ?? null,
          orden: dto.orden ?? 0,
          activo: dto.activo ?? true,
        },
      })
      .catch((e: unknown) => {
        throw this.mapErrorRuta(
          e,
          'Ya existe una página con esa ruta en el módulo',
        );
      });
    return this.aPaginaDto({ ...pagina, ejecutables: [] });
  }

  async actualizarPagina(
    id: number,
    dto: ActualizarPaginaDto,
  ): Promise<PaginaDto> {
    await this.obtenerPagina(id);
    const pagina = await this.prisma.pagina
      .update({
        where: { id },
        data: {
          nombre: dto.nombre,
          ruta: dto.ruta,
          icono: dto.icono,
          orden: dto.orden,
          activo: dto.activo,
        },
        include: { ejecutables: true },
      })
      .catch((e: unknown) => {
        throw this.mapErrorRuta(
          e,
          'Ya existe una página con esa ruta en el módulo',
        );
      });
    return this.aPaginaDto(pagina);
  }

  async eliminarPagina(id: number): Promise<{ ok: true }> {
    await this.obtenerPagina(id);
    await this.prisma.pagina.delete({ where: { id } });
    return { ok: true };
  }

  private async obtenerModulo(id: number) {
    const modulo = await this.prisma.modulo.findUnique({ where: { id } });
    if (!modulo) {
      throw new NotFoundException('El módulo no existe');
    }
    return modulo;
  }

  private async obtenerPagina(id: number) {
    const pagina = await this.prisma.pagina.findUnique({ where: { id } });
    if (!pagina) {
      throw new NotFoundException('La página no existe');
    }
    return pagina;
  }

  private mapErrorRuta(e: unknown, mensaje: string): unknown {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return new ConflictException(mensaje);
    }
    return e;
  }

  private aModuloDto(
    m: Modulo & { paginas?: (Pagina & { ejecutables?: Ejecutable[] })[] },
  ): ModuloDto {
    return {
      id: m.id,
      nombre: m.nombre,
      ruta: m.ruta,
      icono: m.icono,
      orden: m.orden,
      activo: m.activo,
      paginas: m.paginas?.map((p) => this.aPaginaDto(p)),
    };
  }

  private aPaginaDto(p: Pagina & { ejecutables?: Ejecutable[] }): PaginaDto {
    return {
      id: p.id,
      moduloId: p.moduloId,
      nombre: p.nombre,
      ruta: p.ruta,
      icono: p.icono,
      orden: p.orden,
      activo: p.activo,
      ejecutables: p.ejecutables?.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        motor: e.motor,
        conexionId: e.conexionId,
        sentencia: e.sentencia,
        orden: e.orden,
        activo: e.activo,
      })),
    };
  }
}
