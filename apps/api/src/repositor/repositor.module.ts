import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OsrmService } from './osrm.service';
import { RepositorController } from './repositor.controller';
import { RepositorService } from './repositor.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [RepositorController],
  providers: [RepositorService, OsrmService],
})
export class RepositorModule {}
