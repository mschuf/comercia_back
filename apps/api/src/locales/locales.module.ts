import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { LocalesController } from './locales.controller';
import { LocalesService } from './locales.service';
import { TareasLocalController } from './tareas-local.controller';
import { TareasLocalService } from './tareas-local.service';

@Module({
  imports: [PrismaModule, AuthModule, PlataformaModule, ImpulsadorModule],
  controllers: [LocalesController, TareasLocalController],
  providers: [LocalesService, TareasLocalService],
})
export class LocalesModule {}
