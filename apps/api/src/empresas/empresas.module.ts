import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresasController } from './empresas.controller';

@Module({
  imports: [PrismaModule],
  controllers: [EmpresasController],
})
export class EmpresasModule {}
