import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ActualizarTareaGlobalDto,
  CrearTareaGlobalDto,
  ListarTareasGlobalesDto,
} from './dto/tarea-global.dto';
import { TareasService } from './tareas.service';

@ApiTags('tareas')
@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private readonly tareas: TareasService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query() query: ListarTareasGlobalesDto,
  ) {
    return this.tareas.listar(req.usuarioId, query);
  }

  @Post()
  crear(@Req() req: RequestConUsuario, @Body() dto: CrearTareaGlobalDto) {
    return this.tareas.crear(req.usuarioId, dto);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTareaGlobalDto,
  ) {
    return this.tareas.actualizar(req.usuarioId, id, dto);
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.tareas.eliminar(req.usuarioId, id);
  }
}
