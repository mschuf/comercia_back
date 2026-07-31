import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AdminEmpresasController } from './admin-empresas.controller';
import { AdminEmpresasService } from './admin-empresas.service';
import { EmpresasController } from './empresas.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmpresasController, AdminEmpresasController],
  providers: [AdminEmpresasService],
})
export class EmpresasModule {}
