import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { EmpresasModule } from './empresas/empresas.module';
import { HealthModule } from './health/health.module';
import { ImpulsadorModule } from './impulsador/impulsador.module';
import { LocalesModule } from './locales/locales.module';
import { ClientesModule } from './clientes/clientes.module';
import { PlataformaModule } from './plataforma/plataforma.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TareasModule } from './tareas/tareas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.getOrThrow<number>('security.throttleTtl'),
          limit: configService.getOrThrow<number>('security.throttleLimit'),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EmpresasModule,
    PlataformaModule,
    ImpulsadorModule,
    LocalesModule,
    ClientesModule,
    UsuariosModule,
    TareasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
