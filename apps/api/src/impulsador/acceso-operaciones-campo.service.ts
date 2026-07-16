import { Injectable, NotFoundException } from '@nestjs/common';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import { rolVe } from '../plataforma/utils/visibilidad';
import { PrismaService } from '../prisma/prisma.service';
import {
  MODULO_REPOSITOR,
  MODULO_TEAM_LEADER,
  MODULOS_OPERACION_CAMPO,
  PAGINA_MAPA,
  PAGINAS_REPOSITOR,
} from './impulsador.constants';
import type { UsuarioAsignableOperacionesDto } from './interfaces/usuario-asignable-operaciones.interface';
import type { UsuarioOperacionesCampo } from './interfaces/usuario-operaciones-campo.interface';

@Injectable()
export class AccesoOperacionesCampoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: AccesoPlataformaService,
  ) {}

  async usuario(
    usuarioId: number,
    paginasRutas: string[],
  ): Promise<UsuarioOperacionesCampo> {
    const acceso = await this.acceso.exigirAccesosPaginasEnModulos(
      usuarioId,
      MODULOS_OPERACION_CAMPO,
      paginasRutas,
    );
    return {
      ...acceso.usuario,
      esGestor: acceso.modulosRutas.includes(MODULO_TEAM_LEADER),
      esOperativo: acceso.modulosRutas.includes(MODULO_REPOSITOR),
    };
  }

  async usuarioRepositor(
    usuarioId: number,
    paginaRuta: string,
  ): Promise<UsuarioOperacionesCampo> {
    const usuario = await this.acceso.exigirAccesoPagina(
      usuarioId,
      MODULO_REPOSITOR,
      paginaRuta,
    );
    return {
      ...usuario,
      esGestor: false,
      esOperativo: true,
    };
  }

  async validarResponsableTerritorio(
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    try {
      const usuario = await this.acceso.exigirAccesoAlgunaPagina(
        usuarioId,
        MODULO_TEAM_LEADER,
        [PAGINA_MAPA],
      );
      if (usuario.empresaId !== empresaId) throw new Error();
    } catch {
      throw new NotFoundException('El responsable no existe');
    }
  }

  async validarRepositores(
    empresaId: number,
    usuarioIds: number[],
  ): Promise<number[]> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0) return ids;

    try {
      const usuarios = await Promise.all(
        ids.map((usuarioId) =>
          this.acceso.exigirAccesoAlgunaPagina(
            usuarioId,
            MODULO_REPOSITOR,
            PAGINAS_REPOSITOR,
          ),
        ),
      );
      if (usuarios.some((usuario) => usuario.empresaId !== empresaId)) {
        throw new Error();
      }
      return ids;
    } catch {
      throw new NotFoundException('Algún repositor no existe');
    }
  }

  async responsablesTerritorio(
    usuarioId: number,
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    const actual = await this.usuario(usuarioId, [PAGINA_MAPA]);
    if (!actual.esGestor) return [];
    return this.usuariosAsignables(actual.empresaId, MODULO_TEAM_LEADER, [
      PAGINA_MAPA,
    ]);
  }

  async repositoresAsignables(
    empresaId: number,
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    return this.usuariosAsignables(
      empresaId,
      MODULO_REPOSITOR,
      PAGINAS_REPOSITOR,
    );
  }

  private async usuariosAsignables(
    empresaId: number,
    moduloRuta: string,
    paginasRutas: string[],
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    const [usuarios, empresaModulo, paginasAsignadas] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { empresaId, isActive: true },
        select: {
          id: true,
          nombre: true,
          apellido: true,
          nombreLogin: true,
          rolId: true,
          rol: { select: { descripcion: true } },
        },
        orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
        take: 200,
      }),
      this.prisma.empresaModulo.findFirst({
        where: {
          empresaId,
          modulo: { activo: true, ruta: moduloRuta },
        },
        select: {
          todasLasPaginas: true,
          rolIds: true,
          modulo: {
            select: {
              paginas: {
                where: { activo: true, ruta: { in: paginasRutas } },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.empresaPagina.findMany({
        where: {
          empresaId,
          pagina: {
            activo: true,
            ruta: { in: paginasRutas },
            modulo: { activo: true, ruta: moduloRuta },
          },
        },
        select: { paginaId: true, rolIds: true },
        take: 100,
      }),
    ]);
    if (!empresaModulo || empresaModulo.modulo.paginas.length === 0) return [];

    const rolesPorPagina = new Map(
      paginasAsignadas.map((pagina) => [pagina.paginaId, pagina.rolIds]),
    );
    return usuarios
      .filter((usuario) => {
        if (!rolVe(empresaModulo.rolIds, usuario.rolId)) return false;
        if (empresaModulo.todasLasPaginas) return true;
        return empresaModulo.modulo.paginas.some((pagina) => {
          const rolIds = rolesPorPagina.get(pagina.id);
          return rolIds !== undefined && rolVe(rolIds, usuario.rolId);
        });
      })
      .map((usuario) => ({
        id: usuario.id,
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        nombreLogin: usuario.nombreLogin,
        rol: usuario.rol?.descripcion ?? null,
      }));
  }
}
