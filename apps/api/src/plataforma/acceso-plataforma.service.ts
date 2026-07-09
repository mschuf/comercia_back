import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { rolVe } from './utils/visibilidad';

// Datos mínimos del usuario que quedan disponibles tras validar el acceso.
export interface UsuarioConAcceso {
  id: number;
  empresaId: number;
  rolId: number | null;
}

// Control de acceso del plano de DATOS de un módulo (no solo del menú):
// verifica que la empresa del usuario tenga habilitado el módulo Y que el rol
// del usuario pueda ver el módulo y la página, igual que las reglas que aplica
// el menú. Los endpoints de cada módulo lo llaman en su handler para no caer en
// "autenticado ≠ autorizado" (ver AGENTS.md).
@Injectable()
export class AccesoPlataformaService {
  constructor(private readonly prisma: PrismaService) {}

  // Exige que el usuario pueda acceder a una página concreta (por rutas de
  // módulo y página). Lanza 401 si no está activo, 403 si no tiene acceso.
  async exigirAccesoPagina(
    usuarioId: number,
    moduloRuta: string,
    paginaRuta: string,
  ): Promise<UsuarioConAcceso> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, empresaId: true, rolId: true, isActive: true },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }

    const modulo = await this.prisma.modulo.findUnique({
      where: { ruta: moduloRuta },
      select: {
        id: true,
        activo: true,
        paginas: {
          where: { ruta: paginaRuta },
          select: { id: true, activo: true },
        },
      },
    });
    const pagina = modulo?.paginas[0];
    // Mensaje neutro: no revela si el módulo/página existe (AGENTS.md)
    const sinAcceso = new ForbiddenException('No tenés acceso a esta sección');
    if (!modulo || !modulo.activo || !pagina || !pagina.activo) {
      throw sinAcceso;
    }

    const empresaModulo = await this.prisma.empresaModulo.findUnique({
      where: {
        empresaId_moduloId: {
          empresaId: usuario.empresaId,
          moduloId: modulo.id,
        },
      },
      select: { todasLasPaginas: true, rolIds: true },
    });
    if (!empresaModulo || !rolVe(empresaModulo.rolIds, usuario.rolId)) {
      throw sinAcceso;
    }

    // Si el módulo no da "todas las páginas", la página debe estar habilitada
    // para la empresa y visible para el rol del usuario.
    if (!empresaModulo.todasLasPaginas) {
      const empresaPagina = await this.prisma.empresaPagina.findUnique({
        where: {
          empresaId_paginaId: {
            empresaId: usuario.empresaId,
            paginaId: pagina.id,
          },
        },
        select: { rolIds: true },
      });
      if (!empresaPagina || !rolVe(empresaPagina.rolIds, usuario.rolId)) {
        throw sinAcceso;
      }
    }

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
    };
  }

  // Igual que exigirAccesoPagina, pero acepta varias páginas del módulo: pasa
  // si el usuario puede ver ALGUNA. Para endpoints que sirven a más de una
  // vista (ej. los datos del mapa sirven a "mapa" y a "locales").
  async exigirAccesoAlgunaPagina(
    usuarioId: number,
    moduloRuta: string,
    paginasRutas: string[],
  ): Promise<UsuarioConAcceso> {
    let ultimoError: unknown = new ForbiddenException(
      'No tenés acceso a esta sección',
    );
    for (const paginaRuta of paginasRutas) {
      try {
        return await this.exigirAccesoPagina(usuarioId, moduloRuta, paginaRuta);
      } catch (error) {
        // 401 (usuario inexistente/inactivo) no depende de la página: cortar
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        ultimoError = error;
      }
    }
    throw ultimoError;
  }
}
