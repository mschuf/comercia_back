import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminPlataformaController,
  MiPlataformaController,
} from './plataforma.controller';
import { ModulosService } from './modulos.service';
import { EjecutablesService } from './ejecutables.service';
import { AsignacionesService } from './asignaciones.service';
import { MiPlataformaService } from './mi-plataforma.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MiPlataformaController, AdminPlataformaController],
  providers: [
    ModulosService,
    EjecutablesService,
    AsignacionesService,
    MiPlataformaService,
  ],
})
export class PlataformaModule {}
