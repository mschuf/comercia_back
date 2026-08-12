import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import {
  ListarPresentismoDto,
  ResumenPresentismoQueryDto,
} from './dto/presentismo.dto';
import { PresentismoService } from './presentismo.service';

@ApiTags('presentismo')
@Controller('presentismo')
@UseGuards(JwtAuthGuard)
export class PresentismoController {
  constructor(private readonly presentismo: PresentismoService) {}

  @Get('resumen')
  resumen(
    @Req() req: RequestConUsuario,
    @Query() query: ResumenPresentismoQueryDto,
  ) {
    return this.presentismo.resumen(req.usuarioId, query);
  }

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() query: ListarPresentismoDto) {
    return this.presentismo.listar(req.usuarioId, query);
  }
}
