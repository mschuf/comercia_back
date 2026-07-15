import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  PaginacionDto,
  rangoPaginacion,
  respuestaPaginada,
} from '../common/utils/paginacion';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('empresas')
@Controller('empresas')
@UseGuards(JwtAuthGuard)
export class EmpresasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas para selectores administrativos' })
  async listar(@Query() query: PaginacionDto) {
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, empresas] = await Promise.all([
      this.prisma.empresa.count(),
      this.prisma.empresa.findMany({
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(empresas, total, page, limit);
  }
}
