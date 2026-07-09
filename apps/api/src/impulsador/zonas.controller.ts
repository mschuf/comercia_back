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
import { ZonasService } from './zonas.service';
import {
  ActualizarZonaDto,
  CrearZonaDto,
  ListarZonasDto,
} from './dto/zona.dto';

// La autorización fina (gestor vs operativo, empresa propia) vive en el service
@ApiTags('impulsador')
@Controller('zonas')
@UseGuards(JwtAuthGuard)
export class ZonasController {
  constructor(private readonly zonas: ZonasService) {}

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() filtros: ListarZonasDto) {
    return this.zonas.listar(req.usuarioId, filtros);
  }

  // Declarada antes de las rutas :id para que "todas" no matchee como id
  @Get('todas')
  todas(@Req() req: RequestConUsuario) {
    return this.zonas.todas(req.usuarioId);
  }

  @Post()
  crear(@Req() req: RequestConUsuario, @Body() dto: CrearZonaDto) {
    return this.zonas.crear(req.usuarioId, dto);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarZonaDto,
  ) {
    return this.zonas.actualizar(req.usuarioId, id, dto);
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.zonas.eliminar(req.usuarioId, id);
  }
}
