import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ModuloMenu } from './interfaces/plataforma.interface';

@Injectable()
export class MiPlataformaService {
  constructor(private readonly prisma: PrismaService) {}

  // Menú del usuario: los módulos que su empresa habilitó, con las páginas
  // visibles (todas, o solo las asignadas). Solo módulos/páginas activos.
  async menu(usuarioId: number): Promise<ModuloMenu[]> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { empresaId: true, isActive: true },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }

    const habilitados = await this.prisma.empresaModulo.findMany({
      where: { empresaId: usuario.empresaId, modulo: { activo: true } },
      include: {
        modulo: {
          include: {
            paginas: {
              where: { activo: true },
              orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
            },
          },
        },
      },
      orderBy: { modulo: { orden: 'asc' } },
    });

    // Páginas específicas visibles (cuando el módulo no es "todas las páginas")
    const paginasAsignadas = await this.prisma.empresaPagina.findMany({
      where: { empresaId: usuario.empresaId },
      select: { paginaId: true },
    });
    const visiblesEspecificas = new Set(
      paginasAsignadas.map((p) => p.paginaId),
    );

    return (
      habilitados
        .map((em) => {
          const paginas = em.modulo.paginas
            .filter((p) => em.todasLasPaginas || visiblesEspecificas.has(p.id))
            .map((p) => ({
              id: p.id,
              nombre: p.nombre,
              ruta: p.ruta,
              icono: p.icono,
            }));
          return {
            id: em.modulo.id,
            nombre: em.modulo.nombre,
            ruta: em.modulo.ruta,
            icono: em.modulo.icono,
            paginas,
          };
        })
        // Un módulo sin páginas visibles no aparece en el menú
        .filter((m) => m.paginas.length > 0)
    );
  }
}
