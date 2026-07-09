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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { PaginacionDto } from '../common/utils/paginacion';
import { TerritoriosService } from './territorios.service';
import {
  ActualizarTerritorioDto,
  CrearTerritorioDto,
} from './dto/territorio.dto';

// La autorización fina (gestor vs operativo, empresa propia) vive en el service
@ApiTags('impulsador')
@Controller('territorios')
@UseGuards(JwtAuthGuard)
export class TerritoriosController {
  constructor(private readonly territorios: TerritoriosService) {}

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() paginacion: PaginacionDto) {
    return this.territorios.listar(req.usuarioId, paginacion);
  }

  // Declarada antes de las rutas :id para que "todos" no matchee como id
  @Get('todos')
  todos(@Req() req: RequestConUsuario) {
    return this.territorios.todos(req.usuarioId);
  }

  @Post()
  crear(@Req() req: RequestConUsuario, @Body() dto: CrearTerritorioDto) {
    return this.territorios.crear(req.usuarioId, dto);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTerritorioDto,
  ) {
    return this.territorios.actualizar(req.usuarioId, id, dto);
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.territorios.eliminar(req.usuarioId, id);
  }
}
