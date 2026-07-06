import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { LocalesController } from './locales.controller';
import { LocalesService } from './locales.service';

@Module({
  imports: [PrismaModule, AuthModule, PlataformaModule],
  controllers: [LocalesController],
  providers: [LocalesService],
})
export class LocalesModule {}
