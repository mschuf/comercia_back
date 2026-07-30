import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { tipoContenidoImagen } from '../common/utils/tipo-contenido-imagen';
import { IdNotificacionDto } from './dto/id-notificacion.dto';
import { ListarNotificacionesDto } from './dto/listar-notificaciones.dto';
import { NotificacionesService } from './notificaciones.service';

@ApiTags('notificaciones')
@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query() query: ListarNotificacionesDto,
  ) {
    return this.notificaciones.listar(req.usuarioId, query);
  }

  @Get('no-leidas')
  noLeidas(@Req() req: RequestConUsuario) {
    return this.notificaciones.noLeidas(req.usuarioId);
  }

  @Get(':id/foto')
  async foto(
    @Req() req: RequestConUsuario,
    @Param() params: IdNotificacionDto,
    @Res() res: Response,
  ) {
    const ruta = await this.notificaciones.rutaFoto(req.usuarioId, params.id);
    res.setHeader('Content-Type', tipoContenidoImagen(ruta));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(ruta);
  }

  @Patch(':id/leida')
  marcarLeida(
    @Req() req: RequestConUsuario,
    @Param() params: IdNotificacionDto,
  ) {
    return this.notificaciones.marcarLeida(req.usuarioId, params.id);
  }
}
