import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('empresas')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly prisma: PrismaService) {}

  // Público: el formulario de registro necesita la lista antes de loguearse.
  // Solo expone id y nombre (nada sensible como db_name o conexiones).
  @Get()
  @ApiOperation({ summary: 'Listar empresas (para el registro)' })
  async listar(): Promise<{ empresas: { id: number; nombre: string }[] }> {
    const empresas = await this.prisma.empresa.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return { empresas };
  }
}
