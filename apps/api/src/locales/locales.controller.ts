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
import { LocalesService } from './locales.service';
import { ActualizarLocalDto, CrearLocalDto } from './dto/local.dto';

// La autorización fina (gestor vs impulsador, empresa propia) vive en el service
@ApiTags('locales')
@Controller('locales')
@UseGuards(JwtAuthGuard)
export class LocalesController {
  constructor(private readonly locales: LocalesService) {}

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() paginacion: PaginacionDto) {
    return this.locales.listar(req.usuarioId, paginacion);
  }

  @Get('usuarios-asignables')
  usuariosAsignables(@Req() req: RequestConUsuario) {
    return this.locales.usuariosAsignables(req.usuarioId);
  }

  // Declarada después de las rutas GET estáticas para no capturarlas
  @Get(':id')
  detalle(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.locales.detalle(req.usuarioId, id);
  }

  @Post()
  crear(@Req() req: RequestConUsuario, @Body() dto: CrearLocalDto) {
    return this.locales.crear(req.usuarioId, dto);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarLocalDto,
  ) {
    return this.locales.actualizar(req.usuarioId, id, dto);
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.locales.eliminar(req.usuarioId, id);
  }
}
