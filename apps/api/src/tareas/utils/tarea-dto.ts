import type { Prisma } from '../../../generated/prisma/client';
import type { TareaGlobalDto } from '../interfaces/tarea-global.interface';

export const SELECT_TAREA_ADMIN = {
  id: true,
  creadoPorId: true,
  titulo: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
  alcanceUsuarios: true,
  alcanceLocales: true,
  vigenteDesde: true,
  vigenteHasta: true,
  createdAt: true,
  updatedAt: true,
  equipoRaiz: {
    select: { id: true, nombre: true, apellido: true },
  },
  cliente: { select: { id: true, nombre: true } },
  usuarios: {
    select: {
      efecto: true,
      usuario: { select: { id: true, nombre: true, apellido: true } },
    },
    orderBy: { usuarioId: 'asc' as const },
    take: 400,
  },
  locales: {
    select: {
      local: { select: { id: true, nombre: true, clienteId: true } },
    },
    orderBy: { localId: 'asc' as const },
    take: 200,
  },
} satisfies Prisma.TareaSelect;

type TareaAdministracion = Prisma.TareaGetPayload<{
  select: typeof SELECT_TAREA_ADMIN;
}>;

function nombreCompleto(persona: { nombre: string; apellido: string }): string {
  return `${persona.nombre} ${persona.apellido}`.trim();
}

export function aTareaGlobalDto(
  tarea: TareaAdministracion,
  clientesEmpresa: number,
  localesEmpresa: number,
  mostrarDestinatarios = true,
  editable = true,
): TareaGlobalDto {
  const incluidos = tarea.usuarios.filter(({ efecto }) => efecto === 'INCLUIR');
  const excluidos = tarea.usuarios.filter(({ efecto }) => efecto === 'EXCLUIR');
  const clientesAsignados =
    tarea.alcanceLocales === 'TODOS'
      ? clientesEmpresa
      : tarea.alcanceLocales === 'CLIENTE'
        ? tarea.cliente
          ? 1
          : 0
        : new Set(tarea.locales.map(({ local }) => local.clienteId)).size;

  return {
    id: tarea.id,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    activo: tarea.activo,
    editable,
    alcance: tarea.alcanceUsuarios,
    equipoRaiz: tarea.equipoRaiz
      ? {
          id: tarea.equipoRaiz.id,
          nombre: nombreCompleto(tarea.equipoRaiz),
        }
      : null,
    alcanceLocales: tarea.alcanceLocales,
    cliente: tarea.cliente,
    destinatarios: mostrarDestinatarios
      ? incluidos.map(({ usuario }) => ({
          id: usuario.id,
          nombre: nombreCompleto(usuario),
        }))
      : [],
    locales: tarea.locales.map(({ local }) => ({
      id: local.id,
      nombre: local.nombre,
    })),
    usuariosAsignados: mostrarDestinatarios ? incluidos.length : 0,
    usuariosExcluidos: mostrarDestinatarios ? excluidos.length : 0,
    localesAsignados: tarea.locales.length,
    clientesAsignados,
    clientesEmpresa,
    localesEmpresa,
    vigenteDesde: tarea.vigenteDesde?.toISOString() ?? null,
    vigenteHasta: tarea.vigenteHasta?.toISOString() ?? null,
    createdAt: tarea.createdAt.toISOString(),
    updatedAt: tarea.updatedAt.toISOString(),
  };
}
