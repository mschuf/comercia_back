import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ListarRepositoresEquipoDto,
  ListarTareasEquipoDto,
} from './dto/equipo.dto';
import { EquipoService } from './equipo.service';

@ApiTags('equipo')
@Controller('equipo')
@UseGuards(JwtAuthGuard)
export class EquipoController {
  constructor(private readonly equipo: EquipoService) {}

  @Get('repositores')
  repositores(
    @Req() req: RequestConUsuario,
    @Query() query: ListarRepositoresEquipoDto,
  ) {
    return this.equipo.repositores(req.usuarioId, query);
  }

  @Get('tareas')
  tareas(@Req() req: RequestConUsuario, @Query() query: ListarTareasEquipoDto) {
    return this.equipo.tareas(req.usuarioId, query);
  }
}
