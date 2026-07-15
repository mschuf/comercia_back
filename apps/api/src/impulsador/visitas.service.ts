import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { distanciaMetros } from '../common/utils/geo';
import {
  rangoPaginacion,
  respuestaPaginada,
  type RespuestaPaginada,
} from '../common/utils/paginacion';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigImpulsadorService } from './config-impulsador.service';
import {
  ActualizarVisitaTareaDto,
  FinalizarVisitaDto,
  IniciarVisitaDto,
  ListarVisitasEquipoDto,
  ListarVisitasDto,
} from './dto/visita.dto';
import { FotosService } from './fotos.service';
import { PAGINAS_IMPULSADOR } from './impulsador.constants';
import type { UsuarioImpulsador } from './interfaces/usuario-impulsador.interface';
import type {
  VisitaDto,
  VisitaEquipoLocalDto,
  VisitaResumenDto,
  VisitaTareaDto,
} from './interfaces/visita.interface';

type VisitaTareaConTarea = {
  id: number;
  tareaId: number;
  completada: boolean;
  comentario: string | null;
  foto: string | null;
  completadaEn: Date | null;
  tarea: {
    descripcion: string;
    requiereFoto: boolean;
    orden: number;
    activo: boolean;
  };
};

type VisitaConRelaciones = {
  id: number;
  localId: number;
  usuarioId: number;
  iniciadaEn: Date;
  completadaEn: Date | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  local: {
    empresaId: number;
    nombre: string;
    latitud: number;
    longitud: number;
    radioMetros: number | null;
    requiereFotoPresencia: boolean;
  };
  usuario: { nombre: string; apellido: string };
  tareas: VisitaTareaConTarea[];
};

type VisitaResumen = {
  id: number;
  localId: number;
  usuarioId: number;
  iniciadaEn: Date;
  completadaEn: Date | null;
  distanciaMetros: number;
  fotoPresencia: string | null;
  local: { nombre: string };
  usuario: { nombre: string; apellido: string };
  tareas: { completada: boolean }[];
};

type LocalEquipo = {
  id: number;
  nombre: string;
  zona: { id: number; nombre: string } | null;
  fechaVisita: Date | null;
  requiereFotoPresencia: boolean;
  activo: boolean;
  usuario: { id: number; nombre: string; apellido: string } | null;
  tareas: {
    id: number;
    descripcion: string;
    requiereFoto: boolean;
    orden: number;
  }[];
  visitas: {
    id: number;
    usuarioId: number;
    iniciadaEn: Date;
    completadaEn: Date | null;
    usuario: { nombre: string; apellido: string };
    tareas: { tareaId: number; completada: boolean }[];
  }[];
};

// `activo` no viaja al front: se usa para decidir qué tareas exige finalizar()
const SELECT_VISITA_TAREA = {
  id: true,
  tareaId: true,
  completada: true,
  comentario: true,
  foto: true,
  completadaEn: true,
  tarea: {
    select: {
      descripcion: true,
      requiereFoto: true,
      orden: true,
      activo: true,
    },
  },
} as const;

// `local.empresaId` es para autorizar y `latitud/longitud/radioMetros` para la
// verificación de presencia; ninguno sale en el DTO.
const SELECT_VISITA = {
  id: true,
  localId: true,
  usuarioId: true,
  iniciadaEn: true,
  completadaEn: true,
  distanciaMetros: true,
  fotoPresencia: true,
  local: {
    select: {
      empresaId: true,
      nombre: true,
      latitud: true,
      longitud: true,
      radioMetros: true,
      requiereFotoPresencia: true,
    },
  },
  usuario: { select: { nombre: true, apellido: true } },
  tareas: { select: SELECT_VISITA_TAREA },
} as const;

// Historial: solo el flag `completada` de cada tarea; los totales se cuentan
// en memoria en el mapeo (una visita tiene ≤ MAX_TAREAS_POR_LOCAL = 100
// tareas, más simple que armar dos _count filtrados por fila).
const SELECT_VISITA_RESUMEN = {
  id: true,
  localId: true,
  usuarioId: true,
  iniciadaEn: true,
  completadaEn: true,
  distanciaMetros: true,
  fotoPresencia: true,
  local: { select: { nombre: true } },
  usuario: { select: { nombre: true, apellido: true } },
  tareas: { select: { completada: true } },
} as const;

const SELECT_LOCAL_EQUIPO = {
  id: true,
  nombre: true,
  zona: { select: { id: true, nombre: true } },
  fechaVisita: true,
  requiereFotoPresencia: true,
  activo: true,
  usuario: { select: { id: true, nombre: true, apellido: true } },
  tareas: {
    where: { activo: true },
    select: {
      id: true,
      descripcion: true,
      requiereFoto: true,
      orden: true,
    },
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
  },
  visitas: {
    select: {
      id: true,
      usuarioId: true,
      iniciadaEn: true,
      completadaEn: true,
      usuario: { select: { nombre: true, apellido: true } },
      tareas: { select: { tareaId: true, completada: true } },
    },
    orderBy: [{ iniciadaEn: 'desc' }, { id: 'desc' }],
    take: 1,
  },
} satisfies Prisma.LocalSelect;

function nombreCompleto(usuario: { nombre: string; apellido: string }): string {
  return `${usuario.nombre} ${usuario.apellido}`.trim();
}

function aVisitaTareaDto(tarea: VisitaTareaConTarea): VisitaTareaDto {
  return {
    id: tarea.id,
    tareaId: tarea.tareaId,
    descripcion: tarea.tarea.descripcion,
    requiereFoto: tarea.tarea.requiereFoto,
    orden: tarea.tarea.orden,
    completada: tarea.completada,
    comentario: tarea.comentario,
    foto: tarea.foto,
    completadaEn: tarea.completadaEn?.toISOString() ?? null,
  };
}

function aVisitaDto(
  visita: VisitaConRelaciones,
  radioMetrosDefecto: number,
): VisitaDto {
  return {
    id: visita.id,
    localId: visita.localId,
    localNombre: visita.local.nombre,
    usuarioId: visita.usuarioId,
    usuarioNombre: nombreCompleto(visita.usuario),
    iniciadaEn: visita.iniciadaEn.toISOString(),
    completadaEn: visita.completadaEn?.toISOString() ?? null,
    distanciaMetros: visita.distanciaMetros,
    fotoPresencia: visita.fotoPresencia,
    requiereFotoPresencia: visita.local.requiereFotoPresencia,
    radioMetros: visita.local.radioMetros ?? radioMetrosDefecto,
    // El checklist se ordena acá porque el select compartido no fija orderBy
    tareas: [...visita.tareas]
      .sort((a, b) => a.tarea.orden - b.tarea.orden || a.id - b.id)
      .map(aVisitaTareaDto),
  };
}

function aVisitaResumenDto(visita: VisitaResumen): VisitaResumenDto {
  return {
    id: visita.id,
    localId: visita.localId,
    localNombre: visita.local.nombre,
    usuarioId: visita.usuarioId,
    usuarioNombre: nombreCompleto(visita.usuario),
    iniciadaEn: visita.iniciadaEn.toISOString(),
    completadaEn: visita.completadaEn?.toISOString() ?? null,
    distanciaMetros: visita.distanciaMetros,
    fotoPresencia: visita.fotoPresencia,
    tareasTotal: visita.tareas.length,
    tareasCompletadas: visita.tareas.filter((t) => t.completada).length,
  };
}

function aVisitaEquipoLocalDto(local: LocalEquipo): VisitaEquipoLocalDto {
  const ultimaVisita = local.visitas[0] ?? null;
  const completadas = new Set(
    ultimaVisita?.tareas.filter((t) => t.completada).map((t) => t.tareaId) ??
      [],
  );
  const tareas = local.tareas.map((tarea) => ({
    id: tarea.id,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    completada: completadas.has(tarea.id),
  }));

  return {
    localId: local.id,
    localNombre: local.nombre,
    zona: local.zona ? { id: local.zona.id, nombre: local.zona.nombre } : null,
    fechaVisita: local.fechaVisita?.toISOString() ?? null,
    requiereFotoPresencia: local.requiereFotoPresencia,
    activo: local.activo,
    asignadoA: local.usuario
      ? { id: local.usuario.id, nombre: nombreCompleto(local.usuario) }
      : null,
    ultimaVisita: ultimaVisita
      ? {
          id: ultimaVisita.id,
          usuarioId: ultimaVisita.usuarioId,
          usuarioNombre: nombreCompleto(ultimaVisita.usuario),
          iniciadaEn: ultimaVisita.iniciadaEn.toISOString(),
          completadaEn: ultimaVisita.completadaEn?.toISOString() ?? null,
          tareasTotal: tareas.length,
          tareasCompletadas: tareas.filter((t) => t.completada).length,
        }
      : null,
    tareas,
  };
}

function redondear1Decimal(valor: number): number {
  return Math.round(valor * 10) / 10;
}

// Verifica la ubicación reportada contra el radio efectivo del local y
// devuelve la distancia calculada.
function exigirDentroDelRadio(
  latitud: number,
  longitud: number,
  local: { latitud: number; longitud: number },
  radio: number,
): number {
  const distancia = distanciaMetros(
    latitud,
    longitud,
    local.latitud,
    local.longitud,
  );
  if (distancia > radio) {
    throw new BadRequestException(
      `Estás a ~${Math.round(distancia)} m del local y el máximo permitido es ${radio} m. Acercate e intentá de nuevo.`,
    );
  }
  return distancia;
}

// Mensaje neutro: no revela tareas de otras visitas
function tareaDeVisita(
  visita: VisitaConRelaciones,
  visitaTareaId: number,
): VisitaTareaConTarea {
  const tarea = visita.tareas.find((t) => t.id === visitaTareaId);
  if (!tarea) {
    throw new NotFoundException('La tarea no existe');
  }
  return tarea;
}

@Injectable()
export class VisitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigImpulsadorService,
    private readonly fotos: FotosService,
  ) {}

  private usuarioActual(usuarioId: number): Promise<UsuarioImpulsador> {
    return this.config.usuarioImpulsador(usuarioId, PAGINAS_IMPULSADOR);
  }

  // Lectura de una visita: el dueño o un gestor de la misma empresa.
  // 404 neutro en cualquier otro caso (no revela existencia).
  private async visitaVisible(
    usuario: UsuarioImpulsador,
    id: number,
  ): Promise<VisitaConRelaciones> {
    const visita = await this.prisma.visita.findUnique({
      where: { id },
      select: SELECT_VISITA,
    });
    if (
      !visita ||
      visita.local.empresaId !== usuario.empresaId ||
      (visita.usuarioId !== usuario.id && !usuario.esGestor)
    ) {
      throw new NotFoundException('La visita no existe');
    }
    return visita;
  }

  // Mutaciones del flujo: solo el dueño y solo mientras la visita esté abierta
  private async visitaAbiertaPropia(
    usuario: UsuarioImpulsador,
    id: number,
  ): Promise<VisitaConRelaciones> {
    const visita = await this.prisma.visita.findUnique({
      where: { id },
      select: SELECT_VISITA,
    });
    if (
      !visita ||
      visita.local.empresaId !== usuario.empresaId ||
      visita.usuarioId !== usuario.id
    ) {
      throw new NotFoundException('La visita no existe');
    }
    if (visita.completadaEn !== null) {
      throw new BadRequestException('La visita ya fue registrada');
    }
    return visita;
  }

  async iniciar(usuarioId: number, dto: IniciarVisitaDto): Promise<VisitaDto> {
    const usuario = await this.usuarioActual(usuarioId);

    const local = await this.prisma.local.findUnique({
      where: { id: dto.localId },
      select: {
        id: true,
        empresaId: true,
        activo: true,
        usuarioId: true,
        latitud: true,
        longitud: true,
        radioMetros: true,
      },
    });
    // Neutro: mismo mensaje si es de otra empresa o está inactivo
    if (!local || local.empresaId !== usuario.empresaId || !local.activo) {
      throw new NotFoundException('El local no existe');
    }
    const puedeVisitar =
      !usuario.esGestor &&
      local.usuarioId === usuario.id &&
      usuario.esOperativo;
    if (!puedeVisitar) {
      throw new ForbiddenException('No tenés permiso para visitar este local');
    }

    const tareasActivas = await this.prisma.tareaLocal.findMany({
      where: { localId: local.id, activo: true },
      select: { id: true },
      orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    });

    // Si ya hay una visita abierta se retoma en lugar de duplicar (ej. la app
    // se cerró a mitad del checklist), sumando tareas activadas después.
    const abierta = await this.prisma.visita.findFirst({
      where: { localId: local.id, usuarioId: usuario.id, completadaEn: null },
      select: { id: true },
    });
    if (abierta) {
      if (tareasActivas.length > 0) {
        await this.prisma.visitaTarea.createMany({
          data: tareasActivas.map((t) => ({
            visitaId: abierta.id,
            tareaId: t.id,
          })),
          skipDuplicates: true,
        });
      }
      const visita = await this.prisma.visita.findUnique({
        where: { id: abierta.id },
        select: SELECT_VISITA,
      });
      if (!visita) {
        throw new NotFoundException('La visita no existe');
      }
      return aVisitaDto(visita, usuario.radioMetrosDefecto);
    }

    const radio = local.radioMetros ?? usuario.radioMetrosDefecto;
    const distancia = exigirDentroDelRadio(
      dto.latitud,
      dto.longitud,
      local,
      radio,
    );

    // El create anidado corre visita + checklist en una única transacción
    const visita = await this.prisma.visita.create({
      data: {
        localId: local.id,
        usuarioId: usuario.id,
        latitud: dto.latitud,
        longitud: dto.longitud,
        distanciaMetros: redondear1Decimal(distancia),
        tareas: {
          createMany: { data: tareasActivas.map((t) => ({ tareaId: t.id })) },
        },
      },
      select: SELECT_VISITA,
    });
    return aVisitaDto(visita, usuario.radioMetrosDefecto);
  }

  async listar(
    usuarioId: number,
    query: ListarVisitasDto,
  ): Promise<RespuestaPaginada<VisitaResumenDto>> {
    const usuario = await this.usuarioActual(usuarioId);

    if (query.localId !== undefined) {
      const local = await this.prisma.local.findUnique({
        where: { id: query.localId },
        select: { empresaId: true },
      });
      if (!local || local.empresaId !== usuario.empresaId) {
        throw new NotFoundException('El local no existe');
      }
    }

    // Gestor: todas las visitas de su empresa. Operativo: solo las propias.
    const where = {
      local: { empresaId: usuario.empresaId },
      ...(usuario.esGestor ? {} : { usuarioId: usuario.id }),
      ...(query.localId !== undefined ? { localId: query.localId } : {}),
    };

    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, visitas] = await Promise.all([
      this.prisma.visita.count({ where }),
      this.prisma.visita.findMany({
        where,
        select: SELECT_VISITA_RESUMEN,
        orderBy: [{ iniciadaEn: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      visitas.map(aVisitaResumenDto),
      total,
      page,
      limit,
    );
  }

  async equipo(
    usuarioId: number,
    query: ListarVisitasEquipoDto,
  ): Promise<RespuestaPaginada<VisitaEquipoLocalDto>> {
    const usuario = await this.usuarioActual(usuarioId);
    if (!usuario.esGestor) {
      throw new ForbiddenException('Solo un gestor puede ver el equipo');
    }

    const where = { empresaId: usuario.empresaId };
    const { skip, take, page, limit } = rangoPaginacion(query);
    const [total, locales] = await Promise.all([
      this.prisma.local.count({ where }),
      this.prisma.local.findMany({
        where,
        select: SELECT_LOCAL_EQUIPO,
        orderBy: [{ usuarioId: 'asc' }, { nombre: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
    ]);
    return respuestaPaginada(
      locales.map(aVisitaEquipoLocalDto),
      total,
      page,
      limit,
    );
  }

  async detalle(usuarioId: number, id: number): Promise<VisitaDto> {
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaVisible(usuario, id);
    return aVisitaDto(visita, usuario.radioMetrosDefecto);
  }

  async actualizarTarea(
    usuarioId: number,
    visitaId: number,
    visitaTareaId: number,
    dto: ActualizarVisitaTareaDto,
  ): Promise<VisitaTareaDto> {
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaAbiertaPropia(usuario, visitaId);
    const tarea = tareaDeVisita(visita, visitaTareaId);

    const data: {
      completada?: boolean;
      completadaEn?: Date | null;
      comentario?: string | null;
    } = {};
    if (dto.completada !== undefined) {
      data.completada = dto.completada;
      data.completadaEn = dto.completada ? new Date() : null;
    }
    if (dto.comentario !== undefined) {
      // '' y null limpian el comentario
      data.comentario = dto.comentario || null;
    }

    const actualizada = await this.prisma.visitaTarea.update({
      where: { id: tarea.id },
      data,
      select: SELECT_VISITA_TAREA,
    });
    return aVisitaTareaDto(actualizada);
  }

  async subirFotoTarea(
    usuarioId: number,
    visitaId: number,
    visitaTareaId: number,
    archivo: Express.Multer.File | undefined,
  ): Promise<VisitaTareaDto> {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo');
    }
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaAbiertaPropia(usuario, visitaId);
    const tarea = tareaDeVisita(visita, visitaTareaId);

    const nombre = await this.fotos.guardar(archivo);
    const actualizada = await this.prisma.visitaTarea.update({
      where: { id: tarea.id },
      data: { foto: nombre },
      select: SELECT_VISITA_TAREA,
    });
    // La foto anterior se descarta recién después de persistir la nueva
    await this.fotos.borrar(tarea.foto);
    return aVisitaTareaDto(actualizada);
  }

  async borrarFotoTarea(
    usuarioId: number,
    visitaId: number,
    visitaTareaId: number,
  ): Promise<VisitaTareaDto> {
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaAbiertaPropia(usuario, visitaId);
    const tarea = tareaDeVisita(visita, visitaTareaId);

    const actualizada = await this.prisma.visitaTarea.update({
      where: { id: tarea.id },
      data: { foto: null },
      select: SELECT_VISITA_TAREA,
    });
    await this.fotos.borrar(tarea.foto);
    return aVisitaTareaDto(actualizada);
  }

  async subirFotoPresencia(
    usuarioId: number,
    visitaId: number,
    archivo: Express.Multer.File | undefined,
  ): Promise<VisitaDto> {
    if (!archivo) {
      throw new BadRequestException('Falta el archivo');
    }
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaAbiertaPropia(usuario, visitaId);

    const nombre = await this.fotos.guardar(archivo);
    const actualizada = await this.prisma.visita.update({
      where: { id: visita.id },
      data: { fotoPresencia: nombre },
      select: SELECT_VISITA,
    });
    await this.fotos.borrar(visita.fotoPresencia);
    return aVisitaDto(actualizada, usuario.radioMetrosDefecto);
  }

  async finalizar(
    usuarioId: number,
    visitaId: number,
    dto: FinalizarVisitaDto,
  ): Promise<VisitaDto> {
    const usuario = await this.usuarioActual(usuarioId);
    const visita = await this.visitaAbiertaPropia(usuario, visitaId);

    const radio = visita.local.radioMetros ?? usuario.radioMetrosDefecto;
    const distancia = exigirDentroDelRadio(
      dto.latitud,
      dto.longitud,
      visita.local,
      radio,
    );

    // Solo exigen completitud las tareas cuyo ítem del checklist sigue activo
    const activas = visita.tareas.filter((t) => t.tarea.activo);
    if (activas.some((t) => !t.completada)) {
      throw new BadRequestException(
        'Faltan tareas del checklist por completar',
      );
    }
    if (activas.some((t) => t.tarea.requiereFoto && t.foto === null)) {
      throw new BadRequestException('Faltan fotos en tareas que las requieren');
    }
    if (visita.local.requiereFotoPresencia && visita.fotoPresencia === null) {
      throw new BadRequestException('Falta la foto de presencia en el local');
    }

    const registrada = await this.prisma.visita.update({
      where: { id: visita.id },
      data: {
        completadaEn: new Date(),
        latitudFin: dto.latitud,
        longitudFin: dto.longitud,
        distanciaFinMetros: redondear1Decimal(distancia),
      },
      select: SELECT_VISITA,
    });
    return aVisitaDto(registrada, usuario.radioMetrosDefecto);
  }

  // Devuelve la ruta absoluta de la foto solo si el usuario puede verla: es de
  // una visita de su empresa y él es el dueño o un gestor. 404 neutro siempre.
  async autorizarFoto(usuarioId: number, nombre: string): Promise<string> {
    const usuario = await this.usuarioActual(usuarioId);

    // La foto puede ser la de presencia de una visita o la de una tarea
    const [presencia, deTarea] = await Promise.all([
      this.prisma.visita.findFirst({
        where: { fotoPresencia: nombre },
        select: { usuarioId: true, local: { select: { empresaId: true } } },
      }),
      this.prisma.visitaTarea.findFirst({
        where: { foto: nombre },
        select: {
          visita: {
            select: { usuarioId: true, local: { select: { empresaId: true } } },
          },
        },
      }),
    ]);
    const visita = presencia ?? deTarea?.visita ?? null;
    if (
      !visita ||
      visita.local.empresaId !== usuario.empresaId ||
      (visita.usuarioId !== usuario.id && !usuario.esGestor)
    ) {
      throw new NotFoundException('La foto no existe');
    }

    const ruta = this.fotos.rutaAbsoluta(nombre);
    if (!ruta) {
      throw new NotFoundException('La foto no existe');
    }
    return ruta;
  }
}
