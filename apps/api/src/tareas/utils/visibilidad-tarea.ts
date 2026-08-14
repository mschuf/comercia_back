import type { Prisma } from '../../../generated/prisma/client';

interface UsuarioVisibilidadTarea {
  id: number;
}

interface LocalVisibilidadTarea {
  id: number;
  clienteId: number;
}

/**
 * Resuelve el alcance de personas sin materializar una copia por integrante.
 * Una exclusión explícita siempre prevalece sobre empresa/equipo/inclusión.
 */
export function filtroTareaVisiblePara(
  usuario: UsuarioVisibilidadTarea,
): Prisma.TareaWhereInput {
  return {
    AND: [
      {
        usuarios: {
          none: { usuarioId: usuario.id, efecto: 'EXCLUIR' },
        },
      },
      {
        OR: [
          { alcanceUsuarios: 'EMPRESA' },
          {
            usuarios: {
              some: { usuarioId: usuario.id, efecto: 'INCLUIR' },
            },
          },
          {
            alcanceUsuarios: 'EQUIPO_DIRECTO',
            equipoRaiz: {
              is: { subordinados: { some: { id: usuario.id } } },
            },
          },
          {
            alcanceUsuarios: 'EQUIPO_COMPLETO',
            OR: [
              { equipoRaizId: usuario.id },
              {
                equipoRaiz: {
                  is: { subordinados: { some: { id: usuario.id } } },
                },
              },
              {
                equipoRaiz: {
                  is: {
                    subordinados: {
                      some: {
                        subordinados: { some: { id: usuario.id } },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

export function filtroAlcanceLocalTarea(
  local: LocalVisibilidadTarea,
): Prisma.TareaWhereInput {
  return {
    OR: [
      { alcanceLocales: 'TODOS' },
      { alcanceLocales: 'CLIENTE', clienteId: local.clienteId },
      {
        alcanceLocales: 'SELECCIONADOS',
        locales: { some: { localId: local.id } },
      },
    ],
  };
}

/** Alcance operativo completo para construir o consultar un checklist. */
export function filtroTareaAplicableEnLocal(
  usuario: UsuarioVisibilidadTarea,
  local: LocalVisibilidadTarea,
  ahora = new Date(),
): Prisma.TareaWhereInput {
  return {
    activo: true,
    AND: [
      filtroTareaVisiblePara(usuario),
      filtroAlcanceLocalTarea(local),
      {
        OR: [{ vigenteDesde: null }, { vigenteDesde: { lte: ahora } }],
      },
      {
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: ahora } }],
      },
    ],
  };
}
