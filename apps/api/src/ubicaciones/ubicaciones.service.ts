import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarConsentimientoUbicacionDto,
  ListarUbicacionesDto,
  RegistrarUbicacionDto,
} from './dto/ubicacion.dto';
import type {
  ConsentimientoUbicacionDto,
  UbicacionDto,
} from './interfaces/ubicacion.interface';

const MAX_ANTIGUEDAD_UBICACION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ADELANTO_UBICACION_MS = 5 * 60 * 1000;

function aUbicacionDto(ubicacion: {
  id: number;
  latitud: number;
  longitud: number;
  precisionMetros: number | null;
  registradaEn: Date;
  recibidaEn: Date;
}): UbicacionDto {
  return {
    id: ubicacion.id,
    latitud: ubicacion.latitud,
    longitud: ubicacion.longitud,
    precisionMetros: ubicacion.precisionMetros,
    registradaEn: ubicacion.registradaEn.toISOString(),
    recibidaEn: ubicacion.recibidaEn.toISOString(),
  };
}

@Injectable()
export class UbicacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async actualizarConsentimiento(
    usuarioId: number,
    dto: ActualizarConsentimientoUbicacionDto,
  ): Promise<ConsentimientoUbicacionDto> {
    const ahora = new Date();
    if (!dto.aceptado) {
      await this.prisma.consentimientoUbicacion.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: ahora, versionPolitica: dto.versionPolitica },
      });
      return { activo: false, otorgadoEn: null, versionPolitica: null };
    }

    const consentimiento = await this.prisma.consentimientoUbicacion.upsert({
      where: { usuarioId },
      create: {
        usuarioId,
        otorgadoEn: ahora,
        versionPolitica: dto.versionPolitica,
      },
      update: {
        otorgadoEn: ahora,
        revocadoEn: null,
        versionPolitica: dto.versionPolitica,
      },
      select: { otorgadoEn: true, versionPolitica: true },
    });
    return {
      activo: true,
      otorgadoEn: consentimiento.otorgadoEn.toISOString(),
      versionPolitica: consentimiento.versionPolitica,
    };
  }

  async registrar(
    usuarioId: number,
    dto: RegistrarUbicacionDto,
  ): Promise<UbicacionDto> {
    const ahora = new Date();
    const registradaEn = new Date(dto.registradaEn);
    if (
      registradaEn.getTime() < ahora.getTime() - MAX_ANTIGUEDAD_UBICACION_MS ||
      registradaEn.getTime() > ahora.getTime() + MAX_ADELANTO_UBICACION_MS
    ) {
      throw new BadRequestException('La fecha de ubicación no es válida');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        correo: true,
        celular: true,
        consentimientoUbicacion: { select: { revocadoEn: true } },
      },
    });
    if (
      !usuario?.consentimientoUbicacion ||
      usuario.consentimientoUbicacion.revocadoEn
    ) {
      throw new ForbiddenException(
        'El seguimiento de ubicación no está activo',
      );
    }

    const ubicacion = await this.prisma.ubicacionUsuario.create({
      data: {
        usuarioId,
        latitud: dto.latitud,
        longitud: dto.longitud,
        precisionMetros: dto.precisionMetros,
        registradaEn,
        correoUsuario: usuario.correo,
        celularUsuario: usuario.celular,
      },
      select: {
        id: true,
        latitud: true,
        longitud: true,
        precisionMetros: true,
        registradaEn: true,
        recibidaEn: true,
      },
    });
    return aUbicacionDto(ubicacion);
  }

  async listarPropias(
    usuarioId: number,
    query: ListarUbicacionesDto,
  ): Promise<RespuestaPaginada<UbicacionDto>> {
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [ubicaciones, total] = await Promise.all([
      this.prisma.ubicacionUsuario.findMany({
        where: { usuarioId },
        skip,
        take,
        orderBy: [{ registradaEn: 'desc' }, { id: 'desc' }],
        select: {
          id: true,
          latitud: true,
          longitud: true,
          precisionMetros: true,
          registradaEn: true,
          recibidaEn: true,
        },
      }),
      this.prisma.ubicacionUsuario.count({ where: { usuarioId } }),
    ]);
    return respuestaPaginada(
      ubicaciones.map(aUbicacionDto),
      total,
      page,
      limit,
    );
  }
}
