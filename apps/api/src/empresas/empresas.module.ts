import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EmpresasController } from './empresas.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmpresasController],
})
export class EmpresasModule {}
