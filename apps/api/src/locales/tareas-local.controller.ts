import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { TareasLocalService } from './tareas-local.service';

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
}
