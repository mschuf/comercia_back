import { Injectable, NotFoundException } from '@nestjs/common';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MODULOS_GESTION_CAMPO,
  MODULOS_OPERACION_CAMPO,
  MODULOS_OPERATIVOS_CAMPO,
  PAGINA_MAPA,
  PAGINAS_REPOSITOR,
  paginasOperacionEquivalentes,
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
      paginasRutas.flatMap(paginasOperacionEquivalentes),
    );
    return {
      ...acceso.usuario,
      esGestor: acceso.modulosRutas.some((ruta) =>
        MODULOS_GESTION_CAMPO.includes(ruta),
      ),
      esOperativo: acceso.modulosRutas.some((ruta) =>
        MODULOS_OPERATIVOS_CAMPO.includes(ruta),
      ),
    };
  }

  async usuarioRepositor(
    usuarioId: number,
    paginaRuta: string,
  ): Promise<UsuarioOperacionesCampo> {
    const usuario = await this.acceso.exigirAccesoAlgunaPaginaEnModulos(
      usuarioId,
      MODULOS_OPERATIVOS_CAMPO,
      paginasOperacionEquivalentes(paginaRuta),
    );
    return {
      ...usuario,
      esGestor: false,
      esOperativo: true,
    };
  }

  async usuarioSupervisor(
    usuarioId: number,
    paginaRuta: string,
  ): Promise<UsuarioOperacionesCampo> {
    const usuario = await this.acceso.exigirAccesoAlgunaPaginaEnModulos(
      usuarioId,
      MODULOS_GESTION_CAMPO,
      paginasOperacionEquivalentes(paginaRuta),
    );
    return {
      ...usuario,
      esGestor: true,
      esOperativo: false,
    };
  }

  async usuarioSupervisorConAlgunaPagina(
    usuarioId: number,
    paginasRutas: string[],
  ): Promise<UsuarioOperacionesCampo> {
    const usuario = await this.acceso.exigirAccesoAlgunaPaginaEnModulos(
      usuarioId,
      MODULOS_GESTION_CAMPO,
      paginasRutas.flatMap(paginasOperacionEquivalentes),
    );
    return {
      ...usuario,
      esGestor: true,
      esOperativo: false,
    };
  }

  async validarResponsableTerritorio(
    empresaId: number,
    usuarioId: number,
  ): Promise<void> {
    try {
      const usuario = await this.acceso.exigirAccesoAlgunaPaginaEnModulos(
        usuarioId,
        MODULOS_GESTION_CAMPO,
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
          this.acceso.exigirAccesoAlgunaPaginaEnModulos(
            usuarioId,
            MODULOS_OPERATIVOS_CAMPO,
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

  async validarOperativosDelGestor(
    gestor: UsuarioOperacionesCampo,
    usuarioIds: number[],
  ): Promise<number[]> {
    const ids = [...new Set(usuarioIds)];
    if (ids.length === 0) return ids;
    const where = await this.filtroRepositoresDelSupervisor(gestor);
    const encontrados = await this.prisma.usuario.findMany({
      where: { ...where, id: { in: ids } },
      select: { id: true },
      take: 200,
    });
    if (encontrados.length !== ids.length) {
      throw new NotFoundException('Algún impulsador no pertenece a tu equipo');
    }
    return ids;
  }

  async responsablesTerritorio(
    usuarioId: number,
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    const actual = await this.usuario(usuarioId, [PAGINA_MAPA]);
    if (!actual.esGestor) return [];
    return this.usuariosAsignables(actual.empresaId, MODULOS_GESTION_CAMPO, [
      PAGINA_MAPA,
    ]);
  }

  async repositoresAsignables(
    empresaId: number,
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    return this.usuariosAsignables(
      empresaId,
      MODULOS_OPERATIVOS_CAMPO,
      PAGINAS_REPOSITOR,
    );
  }

  // null = todos los roles; undefined = el módulo no está habilitado o no
  // tiene ninguna de las páginas operativas asignada. Un array restringe por rol.
  async restriccionRolesRepositores(
    empresaId: number,
  ): Promise<number[] | null | undefined> {
    return this.restriccionRolesAsignablesEnModulos(
      empresaId,
      MODULOS_OPERATIVOS_CAMPO,
      PAGINAS_REPOSITOR,
    );
  }

  async filtroRepositoresDelSupervisor(supervisor: UsuarioOperacionesCampo) {
    const roles = await this.restriccionRolesRepositores(supervisor.empresaId);
    return {
      empresaId: supervisor.empresaId,
      isActive: true,
      superiorId: supervisor.id,
      ...(roles === null ? {} : { rolId: { in: roles ?? [] } }),
    };
  }

  private async restriccionRolesAsignables(
    empresaId: number,
    moduloRuta: string,
    paginasRutas: string[],
  ): Promise<number[] | null | undefined> {
    const empresaModulo = await this.prisma.empresaModulo.findFirst({
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
    });
    if (!empresaModulo || empresaModulo.modulo.paginas.length === 0) {
      return undefined;
    }

    const rolesModulo = empresaModulo.rolIds;
    if (empresaModulo.todasLasPaginas) {
      return rolesModulo.length === 0 ? null : [...new Set(rolesModulo)];
    }

    const paginasIds = empresaModulo.modulo.paginas.map((pagina) => pagina.id);
    const paginasAsignadas = await this.prisma.empresaPagina.findMany({
      where: { empresaId, paginaId: { in: paginasIds } },
      select: { paginaId: true, rolIds: true },
      take: 100,
    });
    if (paginasAsignadas.length === 0) return undefined;

    const roles = new Set<number>();
    for (const pagina of paginasAsignadas) {
      if (pagina.rolIds.length === 0) {
        if (rolesModulo.length === 0) return null;
        rolesModulo.forEach((rolId) => roles.add(rolId));
        continue;
      }
      const rolesPagina =
        rolesModulo.length === 0
          ? pagina.rolIds
          : pagina.rolIds.filter((rolId) => rolesModulo.includes(rolId));
      rolesPagina.forEach((rolId) => roles.add(rolId));
    }
    return roles.size === 0 ? undefined : [...roles];
  }

  private async restriccionRolesAsignablesEnModulos(
    empresaId: number,
    modulosRutas: string[],
    paginasRutas: string[],
  ): Promise<number[] | null | undefined> {
    const restricciones = await Promise.all(
      modulosRutas.map((moduloRuta) =>
        this.restriccionRolesAsignables(empresaId, moduloRuta, paginasRutas),
      ),
    );
    if (restricciones.some((roles) => roles === null)) return null;
    const ids = new Set<number>();
    restricciones.forEach((roles) => roles?.forEach((id) => ids.add(id)));
    return ids.size === 0 ? undefined : [...ids];
  }

  private async usuariosAsignables(
    empresaId: number,
    modulosRutas: string[],
    paginasRutas: string[],
  ): Promise<UsuarioAsignableOperacionesDto[]> {
    const restriccionRoles = await this.restriccionRolesAsignablesEnModulos(
      empresaId,
      modulosRutas,
      paginasRutas,
    );
    if (restriccionRoles === undefined) return [];

    const usuarios = await this.prisma.usuario.findMany({
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
    });
    return usuarios
      .filter((usuario) => {
        if (restriccionRoles === null) return true;
        return (
          usuario.rolId !== null && restriccionRoles.includes(usuario.rolId)
        );
      })
      .map((usuario) => ({
        id: usuario.id,
        nombre: `${usuario.nombre} ${usuario.apellido}`.trim(),
        nombreLogin: usuario.nombreLogin,
        rol: usuario.rol?.descripcion ?? null,
      }));
  }
}
