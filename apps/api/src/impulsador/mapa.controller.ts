import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { MapaService } from './mapa.service';

// La autorización fina (acceso al módulo, gestor vs operativo) vive en el service
@ApiTags('impulsador')
@Controller('impulsador')
@UseGuards(JwtAuthGuard)
export class MapaController {
  constructor(private readonly mapa: MapaService) {}

  @Get('mapa')
  datos(@Req() req: RequestConUsuario) {
    return this.mapa.datos(req.usuarioId);
  }
}
