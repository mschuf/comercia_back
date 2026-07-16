import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { MapaService } from './mapa.service';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';

// La autorización fina (acceso al módulo, gestor vs operativo) vive en el service
@ApiTags('operaciones-campo')
@Controller('operaciones-campo')
@UseGuards(JwtAuthGuard)
export class MapaController {
  constructor(
    private readonly mapa: MapaService,
    private readonly accesoCampo: AccesoOperacionesCampoService,
  ) {}

  @Get('mapa')
  datos(@Req() req: RequestConUsuario) {
    return this.mapa.datos(req.usuarioId);
  }

  @Get('responsables-territorio')
  responsablesTerritorio(@Req() req: RequestConUsuario) {
    return this.accesoCampo.responsablesTerritorio(req.usuarioId);
  }
}
