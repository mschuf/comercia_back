import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EquipoController } from './equipo.controller';
import { EquipoService } from './equipo.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [EquipoController],
  providers: [EquipoService],
})
export class EquipoModule {}
