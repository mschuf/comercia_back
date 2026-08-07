import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ActualizarConsentimientoUbicacionDto,
  ListarUbicacionesDto,
  RegistrarUbicacionDto,
} from './dto/ubicacion.dto';
import { UbicacionesService } from './ubicaciones.service';

@ApiTags('ubicaciones')
@Controller('ubicaciones')
@UseGuards(JwtAuthGuard)
export class UbicacionesController {
  constructor(private readonly ubicaciones: UbicacionesService) {}

  @Post('consentimiento')
  actualizarConsentimiento(
    @Req() req: RequestConUsuario,
    @Body() dto: ActualizarConsentimientoUbicacionDto,
  ) {
    return this.ubicaciones.actualizarConsentimiento(req.usuarioId, dto);
  }

  @Post()
  registrar(@Req() req: RequestConUsuario, @Body() dto: RegistrarUbicacionDto) {
    return this.ubicaciones.registrar(req.usuarioId, dto);
  }

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() query: ListarUbicacionesDto) {
    return this.ubicaciones.listarPropias(req.usuarioId, query);
  }
}
