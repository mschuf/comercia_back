import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlataformaModule } from '../plataforma/plataforma.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminConfigImpulsadorController,
  ConfigImpulsadorController,
} from './config-impulsador.controller';
import { ConfigImpulsadorService } from './config-impulsador.service';
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
    ConfigImpulsadorController,
    AdminConfigImpulsadorController,
    VisitasController,
  ],
  providers: [
    TerritoriosService,
    ZonasService,
    MapaService,
    ConfigImpulsadorService,
    VisitasService,
    FotosService,
  ],
  // LocalesModule usa la config para decidir gestor/operativo y el radio
  exports: [ConfigImpulsadorService],
})
export class ImpulsadorModule {}
