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
import { ClientesService } from './clientes.service';
import {
  ActualizarClienteDto,
  CrearClienteDto,
  ListarClientesDto,
} from './dto/cliente.dto';

@ApiTags('clientes')
@Controller('clientes')
@UseGuards(JwtAuthGuard)
export class ClientesController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar(@Req() req: RequestConUsuario, @Query() query: ListarClientesDto) {
    return this.clientes.listar(req.usuarioId, query);
  }

  @Post()
  crear(@Req() req: RequestConUsuario, @Body() dto: CrearClienteDto) {
    return this.clientes.crear(req.usuarioId, dto);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClienteDto,
  ) {
    return this.clientes.actualizar(req.usuarioId, id, dto);
  }

  @Delete(':id')
  eliminar(
    @Req() req: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.clientes.eliminar(req.usuarioId, id);
  }
}
