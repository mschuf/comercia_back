import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { RequestConUsuario } from '../auth/interfaces/request-con-usuario.interface';
import { CatalogoCampoService } from './catalogo-campo.service';
import { PlanificacionCampoService } from './planificacion-campo.service';
import { JornadaCampoService } from './jornada-campo.service';
import {
  AsignacionCampoDto,
  BackupCampoDto,
  ClienteCampoDto,
  ConsultaCampoDto,
  EntradaCampoDto,
  HorarioCampoDto,
  LocalCampoDto,
  MarcaCampoDto,
  TareaCampoDto,
} from './dto/campo.dto';

@Controller('campo')
@UseGuards(JwtAuthGuard)
export class CampoController {
  constructor(
    private readonly catalogo: CatalogoCampoService,
    private readonly plan: PlanificacionCampoService,
    private readonly jornada: JornadaCampoService,
  ) {}

  @Get('clientes') clientes(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.catalogo.clientes(r.usuarioId, q);
  }
  @Post('clientes') crearCliente(
    @Req() r: RequestConUsuario,
    @Body() d: ClienteCampoDto,
  ) {
    return this.catalogo.guardarCliente(r.usuarioId, d);
  }
  @Put('clientes/:id') editarCliente(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: ClienteCampoDto,
  ) {
    return this.catalogo.guardarCliente(r.usuarioId, d, id);
  }
  @Delete('clientes/:id') eliminarCliente(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogo.eliminarCliente(r.usuarioId, id);
  }

  @Get('locales') locales(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.catalogo.locales(r.usuarioId, q);
  }
  @Post('locales') crearLocal(
    @Req() r: RequestConUsuario,
    @Body() d: LocalCampoDto,
  ) {
    return this.catalogo.guardarLocal(r.usuarioId, d);
  }
  @Put('locales/:id') editarLocal(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: LocalCampoDto,
  ) {
    return this.catalogo.guardarLocal(r.usuarioId, d, id);
  }
  @Delete('locales/:id') eliminarLocal(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogo.eliminarLocal(r.usuarioId, id);
  }

  @Get('tareas') tareas(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.catalogo.tareas(r.usuarioId, q);
  }
  @Post('tareas') crearTarea(
    @Req() r: RequestConUsuario,
    @Body() d: TareaCampoDto,
  ) {
    return this.catalogo.guardarTarea(r.usuarioId, d);
  }
  @Put('tareas/:id') editarTarea(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: TareaCampoDto,
  ) {
    return this.catalogo.guardarTarea(r.usuarioId, d, id);
  }
  @Delete('tareas/:id') eliminarTarea(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.catalogo.eliminarTarea(r.usuarioId, id);
  }

  @Get('equipo') equipo(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.plan.equipo(r.usuarioId, q);
  }
  @Get('locales/:localId/horarios') horarios(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) id: number,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.plan.horarios(r.usuarioId, id, q);
  }
  @Post('locales/:localId/horarios') crearHorario(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) id: number,
    @Body() d: HorarioCampoDto,
  ) {
    return this.plan.guardarHorario(r.usuarioId, id, d);
  }
  @Put('locales/:localId/horarios/:id') editarHorario(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: HorarioCampoDto,
  ) {
    return this.plan.guardarHorario(r.usuarioId, localId, d, id);
  }
  @Delete('locales/:localId/horarios/:id') eliminarHorario(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) localId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plan.eliminarHorario(r.usuarioId, localId, id);
  }

  @Get('locales/:localId/asignaciones') asignaciones(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) id: number,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.plan.asignaciones(r.usuarioId, id, q);
  }
  @Post('locales/:localId/asignaciones') asignar(
    @Req() r: RequestConUsuario,
    @Param('localId', ParseIntPipe) id: number,
    @Body() d: AsignacionCampoDto,
  ) {
    return this.plan.asignar(r.usuarioId, id, d);
  }
  @Delete('asignaciones/:id') quitarAsignacion(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plan.quitarAsignacion(r.usuarioId, id);
  }
  @Get('asignaciones/:id/backups') backups(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.plan.backups(r.usuarioId, id, q);
  }
  @Post('asignaciones/:id/backups') crearBackup(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: BackupCampoDto,
  ) {
    return this.plan.crearBackup(r.usuarioId, id, d);
  }
  @Delete('asignaciones/:asignacionId/backups/:id') quitarBackup(
    @Req() r: RequestConUsuario,
    @Param('asignacionId', ParseIntPipe) asignacionId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.plan.quitarBackup(r.usuarioId, asignacionId, id);
  }
  @Get('visitas') visitas(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.jornada.visitas(r.usuarioId, q, true);
  }

  @Get('jornada') agenda(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.jornada.agenda(r.usuarioId, q);
  }
  @Get('jornada/abierta') abierta(@Req() r: RequestConUsuario) {
    return this.jornada.abierta(r.usuarioId);
  }
  @Get('jornada/visitas') misVisitas(
    @Req() r: RequestConUsuario,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.jornada.visitas(r.usuarioId, q);
  }
  @Get('jornada/asignaciones/:id/tareas') tareasJornada(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: ConsultaCampoDto,
  ) {
    return this.jornada.tareas(r.usuarioId, id, q);
  }
  @Post('jornada/entrada') entrada(
    @Req() r: RequestConUsuario,
    @Body() d: EntradaCampoDto,
  ) {
    return this.jornada.entrada(r.usuarioId, d);
  }
  @Post('jornada/visitas/:id/salida') salida(
    @Req() r: RequestConUsuario,
    @Param('id', ParseIntPipe) id: number,
    @Body() d: MarcaCampoDto,
  ) {
    return this.jornada.salida(r.usuarioId, id, d);
  }
  @Post('jornada/visitas/:visitaId/tareas/:tareaId') completar(
    @Req() r: RequestConUsuario,
    @Param('visitaId', ParseIntPipe) visitaId: number,
    @Param('tareaId', ParseIntPipe) tareaId: number,
  ) {
    return this.jornada.completar(r.usuarioId, visitaId, tareaId);
  }
}
