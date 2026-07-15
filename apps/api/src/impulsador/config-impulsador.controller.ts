import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { ConfigImpulsadorService } from './config-impulsador.service';
import { ActualizarConfigImpulsadorDto } from './dto/config-impulsador.dto';

// Config del módulo aplicada al usuario actual (el acceso fino vive en el service)
@ApiTags('impulsador')
@Controller('impulsador')
@UseGuards(JwtAuthGuard)
export class ConfigImpulsadorController {
  constructor(private readonly configImpulsador: ConfigImpulsadorService) {}

  @Get('config')
  miConfig(@Req() req: RequestConUsuario) {
    return this.configImpulsador.paraUsuario(req.usuarioId);
  }

  @Get('responsables-territorio')
  responsablesTerritorio(@Req() req: RequestConUsuario) {
    return this.configImpulsador.responsablesTerritorio(req.usuarioId);
  }
}

// Config por empresa: SOLO superadmin (JwtAuthGuard + SuperadminGuard en todo)
@ApiTags('admin-impulsador')
@Controller('admin/impulsador')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class AdminConfigImpulsadorController {
  constructor(private readonly configImpulsador: ConfigImpulsadorService) {}

  @Get('config/:empresaId')
  configDeEmpresa(@Param('empresaId', ParseIntPipe) empresaId: number) {
    return this.configImpulsador.admin(empresaId);
  }

  @Put('config/:empresaId')
  actualizar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Body() dto: ActualizarConfigImpulsadorDto,
  ) {
    return this.configImpulsador.actualizar(empresaId, dto);
  }
}
