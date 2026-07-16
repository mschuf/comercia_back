import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AccesoOperacionesCampoService } from './acceso-operaciones-campo.service';
import { FotosService } from './fotos.service';
import { MapaController } from './mapa.controller';
import { MapaService } from './mapa.service';
import { TerritoriosController } from './territorios.controller';
import { TerritoriosService } from './territorios.service';
import { VisitasController } from './visitas.controller';
import { VisitasService } from './visitas.service';
import { ZonasController } from './zonas.controller';
import { ZonasService } from './zonas.service';

@Module({
  imports: [PrismaModule, AuthModule, PlataformaModule],
  controllers: [
    TerritoriosController,
    ZonasController,
    MapaController,
    VisitasController,
  ],
  providers: [
    TerritoriosService,
    ZonasService,
    MapaService,
    AccesoOperacionesCampoService,
    VisitasService,
    FotosService,
  ],
  exports: [AccesoOperacionesCampoService],
})
export class ImpulsadorModule {}
