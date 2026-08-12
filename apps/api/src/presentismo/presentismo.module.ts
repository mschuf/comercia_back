import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PresentismoController } from './presentismo.controller';
import { PresentismoService } from './presentismo.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [PresentismoController],
  providers: [PresentismoService],
})
export class PresentismoModule {}
