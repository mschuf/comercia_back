import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { extname } from 'node:path';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GuardarProgramacionVisitaDto } from './dto/programacion-visita.dto';
import {
  ActualizarVisitaTareaDto,
  FinalizarVisitaDto,
  IniciarVisitaDto,
  ListarVisitasEquipoDto,
  ListarVisitasDto,
} from './dto/visita.dto';
import { FOTO_MAX_BYTES } from './impulsador.constants';
import { VisitasService } from './visitas.service';

// Content-Type según la extensión, ya validada por FotosService.rutaAbsoluta
const MIME_POR_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

// La autorización fina (empresa, dueño vs gestor, visita abierta) vive en el service
@ApiTags('visitas')
@Controller('visitas')
@UseGuards(JwtAuthGuard)
export class VisitasController {
  constructor(private readonly visitas: VisitasService) {}

  // Declarada ANTES que las rutas ':id' para que 'fotos' no se parsee como id
  @Get('fotos/:nombre')
  async foto(
    @Req() req: RequestConUsuario,
    @Param('nombre') nombre: string,
    @Res() res: Response,
  ) {
    const ruta = await this.visitas.autorizarFoto(req.usuarioId, nombre);
    res.setHeader(
      'Content-Type',
      MIME_POR_EXTENSION[extname(nombre)] ?? 'application/octet-stream',
    );
    // Privada: la sirve autenticada, el navegador puede cachearla una hora
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(ruta);
  }

  @Post()
  iniciar(@Req() req: RequestConUsuario, @Body() dto: IniciarVisitaDto) {
    return this.visitas.iniciar(req.usuarioId, dto);
  }

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() query: ListarVisitasDto) {
    return this.visitas.listar(req.usuarioId, query);
  }

  @Get('equipo')
  equipo(
    @Req() req: RequestConUsuario,
    @Query() query: ListarVisitasEquipoDto,
  ) {
    return this.visitas.equipo(req.usuarioId, query);
  }

  @Put('equipo/:localId/programacion')
  guardarProgramacion(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Body() dto: GuardarProgramacionVisitaDto,
  ) {
    return this.visitas.guardarProgramacion(req.usuarioId, localId, dto);
  }

  @Delete('equipo/:localId/programacion')
  async quitarProgramacion(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
  ) {
    await this.visitas.quitarProgramacion(req.usuarioId, localId);
    return { ok: true };
  }

  @Get(':id')
  detalle(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.visitas.detalle(req.usuarioId, id);
  }

  @Patch(':id/tareas/:visitaTareaId')
  actualizarTarea(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Param('visitaTareaId', ParseIntPipe) visitaTareaId: number,
    @Body() dto: ActualizarVisitaTareaDto,
  ) {
    return this.visitas.actualizarTarea(req.usuarioId, id, visitaTareaId, dto);
  }

  @Post(':id/tareas/:visitaTareaId/foto')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: FOTO_MAX_BYTES } }),
  )
  subirFotoTarea(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Param('visitaTareaId', ParseIntPipe) visitaTareaId: number,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.visitas.subirFotoTarea(
      req.usuarioId,
      id,
      visitaTareaId,
      archivo,
    );
  }

  @Delete(':id/tareas/:visitaTareaId/foto')
  borrarFotoTarea(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Param('visitaTareaId', ParseIntPipe) visitaTareaId: number,
  ) {
    return this.visitas.borrarFotoTarea(req.usuarioId, id, visitaTareaId);
  }

  @Post(':id/foto-presencia')
  @UseInterceptors(
    FileInterceptor('foto', { limits: { fileSize: FOTO_MAX_BYTES } }),
  )
  subirFotoPresencia(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.visitas.subirFotoPresencia(req.usuarioId, id, archivo);
  }

  @Post(':id/finalizar')
  finalizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: FinalizarVisitaDto,
  ) {
    return this.visitas.finalizar(req.usuarioId, id, dto);
  }
}
