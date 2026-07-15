import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImpulsadorModule } from '../impulsador/impulsador.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [PrismaModule, AuthModule, ImpulsadorModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
