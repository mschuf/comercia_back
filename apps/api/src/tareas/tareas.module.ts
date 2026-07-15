import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TareasController } from './tareas.controller';
import { TareasService } from './tareas.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [TareasController],
  providers: [TareasService],
})
export class TareasModule {}
