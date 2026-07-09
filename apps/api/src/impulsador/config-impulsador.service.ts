import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccesoPlataformaService } from '../plataforma/acceso-plataforma.service';
import { esRolGestor, esRolOperativo } from '../common/utils/roles-impulsador';
import { MODULO_IMPULSADOR, PAGINAS_IMPULSADOR } from './impulsador.constants';
import { ActualizarConfigImpulsadorDto } from './dto/config-impulsador.dto';
import type {
  ConfigImpulsadorAdminDto,
  ConfigImpulsadorDto,
} from './interfaces/config-impulsador.interface';
import type { UsuarioImpulsador } from './interfaces/usuario-impulsador.interface';

// Debe coincidir con el default de la columna radio_metros_defecto del schema
const RADIO_METROS_DEFECTO = 200;

// Config efectiva de una empresa (con defaults si nunca la guardó)
interface ConfigEmpresa {
  rolGestorIds: number[];
  rolOperativoIds: number[];
  radioMetrosDefecto: number;
}

@Injectable()
export class ConfigImpulsadorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly acceso: AccesoPlataformaService,
  ) {}

  // Config de la empresa; sin fila guardada aplican los defaults del módulo
  async deEmpresa(empresaId: number): Promise<ConfigEmpresa> {
    const config = await this.prisma.configImpulsador.findUnique({
      where: { empresaId },
      select: {
        rolGestorIds: true,
        rolOperativoIds: true,
        radioMetrosDefecto: true,
      },
    });
    return (
      config ?? {
        rolGestorIds: [],
        rolOperativoIds: [],
        radioMetrosDefecto: RADIO_METROS_DEFECTO,
      }
    );
  }

  // Cortafuegos común del módulo: valida el acceso por plataforma (empresa +
  // rol, autenticado ≠ autorizado) y resuelve los permisos efectivos del
  // usuario según la config de su empresa. Todos los services del módulo
  // arrancan por acá.
  async usuarioImpulsador(
    usuarioId: number,
    paginasRutas: string[],
  ): Promise<UsuarioImpulsador> {
    await this.acceso.exigirAccesoAlgunaPagina(
      usuarioId,
      MODULO_IMPULSADOR,
      paginasRutas,
    );

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        empresaId: true,
        rolId: true,
        isActive: true,
        esSuperadmin: true,
        rol: { select: { descripcion: true } },
      },
    });
    if (!usuario || !usuario.isActive) {
      throw new UnauthorizedException();
    }

    const config = await this.deEmpresa(usuario.empresaId);
    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      esGestor:
        usuario.esSuperadmin ||
        esRolGestor(
          usuario.rolId,
          usuario.rol?.descripcion ?? null,
          config.rolGestorIds,
        ),
      esOperativo: esRolOperativo(usuario.rolId, config.rolOperativoIds),
      radioMetrosDefecto: config.radioMetrosDefecto,
    };
  }

  // Config de la empresa del usuario + cómo le aplica a él (GET /impulsador/config)
  async paraUsuario(usuarioId: number): Promise<ConfigImpulsadorDto> {
    const usuario = await this.usuarioImpulsador(usuarioId, PAGINAS_IMPULSADOR);
    const config = await this.deEmpresa(usuario.empresaId);
    return {
      rolGestorIds: config.rolGestorIds,
      rolOperativoIds: config.rolOperativoIds,
      radioMetrosDefecto: config.radioMetrosDefecto,
      esGestor: usuario.esGestor,
      esOperativo: usuario.esOperativo,
    };
  }

  private async exigirEmpresa(empresaId: number): Promise<void> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true },
    });
    if (!empresa) {
      throw new NotFoundException('La empresa no existe');
    }
  }

  // Vista del superadmin: config de cualquier empresa (defaults si no hay fila)
  async admin(empresaId: number): Promise<ConfigImpulsadorAdminDto> {
    await this.exigirEmpresa(empresaId);
    const config = await this.deEmpresa(empresaId);
    return { empresaId, ...config };
  }

  // PUT del superadmin: reemplaza la config completa de la empresa
  async actualizar(
    empresaId: number,
    dto: ActualizarConfigImpulsadorDto,
  ): Promise<ConfigImpulsadorAdminDto> {
    await this.exigirEmpresa(empresaId);

    const rolGestorIds = dto.rolGestorIds ?? [];
    const rolOperativoIds = dto.rolOperativoIds ?? [];
    const radioMetrosDefecto = dto.radioMetrosDefecto ?? RADIO_METROS_DEFECTO;

    // Los roles indicados deben existir (mismo patrón que asignaciones)
    const rolIdsTodos = [...new Set([...rolGestorIds, ...rolOperativoIds])];
    if (rolIdsTodos.length > 0) {
      const rolesValidos = await this.prisma.rol.count({
        where: { id: { in: rolIdsTodos } },
      });
      if (rolesValidos !== rolIdsTodos.length) {
        throw new BadRequestException('Algún rol indicado no existe');
      }
    }

    const config = await this.prisma.configImpulsador.upsert({
      where: { empresaId },
      create: { empresaId, rolGestorIds, rolOperativoIds, radioMetrosDefecto },
      update: { rolGestorIds, rolOperativoIds, radioMetrosDefecto },
      select: {
        empresaId: true,
        rolGestorIds: true,
        rolOperativoIds: true,
        radioMetrosDefecto: true,
      },
    });
    return {
      empresaId: config.empresaId,
      rolGestorIds: config.rolGestorIds,
      rolOperativoIds: config.rolOperativoIds,
      radioMetrosDefecto: config.radioMetrosDefecto,
    };
  }
}
