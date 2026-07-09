import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { TareasLocalService } from './tareas-local.service';
import {
  ActualizarTareaLocalDto,
  CrearTareaLocalDto,
} from './dto/tarea-local.dto';

// Checklist de un local. La autorización fina (gestor vs asignado, empresa
// propia) vive en el service.
@ApiTags('locales')
@Controller('locales/:localId/tareas')
@UseGuards(JwtAuthGuard)
export class TareasLocalController {
  constructor(private readonly tareas: TareasLocalService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
  ) {
    return this.tareas.listar(req.usuarioId, localId);
  }

  @Post()
  crear(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Body() dto: CrearTareaLocalDto,
  ) {
    return this.tareas.crear(req.usuarioId, localId, dto);
  }

  @Patch(':tareaId')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
    @Body() dto: ActualizarTareaLocalDto,
  ) {
    return this.tareas.actualizar(req.usuarioId, localId, tareaId, dto);
  }

  @Delete(':tareaId')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
  ) {
    return this.tareas.eliminar(req.usuarioId, localId, tareaId);
  }
}
