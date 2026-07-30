import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
})
export class NotificacionesModule {}
