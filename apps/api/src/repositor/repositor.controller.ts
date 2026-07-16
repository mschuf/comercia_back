import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListarClientesRepositorDto } from './dto/listar-clientes-repositor.dto';
import { ListarLocalesRepositorDto } from './dto/listar-locales-repositor.dto';
import { ListarTareasRepositorDto } from './dto/listar-tareas-repositor.dto';
import { ListarVisitasHoyDto } from './dto/listar-visitas-hoy.dto';
import { RutaHoyDto } from './dto/ruta-hoy.dto';
import { RepositorService } from './repositor.service';

@ApiTags('repositor')
@Controller('repositor')
@UseGuards(JwtAuthGuard)
export class RepositorController {
  constructor(private readonly repositor: RepositorService) {}

  @Get('clientes')
  clientes(
    @Req() req: RequestConUsuario,
    @Query() query: ListarClientesRepositorDto,
  ) {
    return this.repositor.clientes(req.usuarioId, query);
  }

  @Get('locales')
  locales(
    @Req() req: RequestConUsuario,
    @Query() query: ListarLocalesRepositorDto,
  ) {
    return this.repositor.locales(req.usuarioId, query);
  }

  @Get('tareas')
  tareas(
    @Req() req: RequestConUsuario,
    @Query() query: ListarTareasRepositorDto,
  ) {
    return this.repositor.tareas(req.usuarioId, query);
  }

  @Get('ruta-hoy')
  rutaHoy(@Req() req: RequestConUsuario, @Query() query: RutaHoyDto) {
    return this.repositor.rutaHoy(req.usuarioId, query);
  }

  @Get('visitas-hoy')
  visitasHoy(
    @Req() req: RequestConUsuario,
    @Query() query: ListarVisitasHoyDto,
  ) {
    return this.repositor.visitasHoy(req.usuarioId, query);
  }
}
