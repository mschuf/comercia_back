import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
