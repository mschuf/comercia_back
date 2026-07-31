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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { PaginacionDto } from '../common/utils/paginacion';
import { ActualizarRolDto, CrearRolDto } from './dto/rol.dto';
import { RolesService } from './roles.service';

@ApiTags('administración')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, SuperadminGuard)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  listar(@Query() query: PaginacionDto) {
    return this.roles.listar(query);
  }

  @Post()
  crear(@Body() dto: CrearRolDto) {
    return this.roles.crear(dto);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarRolDto,
  ) {
    return this.roles.actualizar(id, dto);
  }

  @Delete(':id')
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.roles.eliminar(id);
  }
}
