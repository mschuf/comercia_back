import type { Prisma } from '../../../generated/prisma/client';
import {
  ROL_IMPULSADOR,
  ROL_SUPERVISOR_IMPULSADOR,
  ROL_TEAMLEADER_IMPULSADOR,
} from '../../common/constants/roles-negocio';

interface UsuarioVisibilidadTarea {
  id: number;
  rolDescripcion: string | null;
}

const ROLES_GESTION_IMPULSADORES = [
  ROL_SUPERVISOR_IMPULSADOR,
  ROL_TEAMLEADER_IMPULSADOR,
] as const;

function perteneceOperacionImpulsadores(rol: string | null): boolean {
  return rol === ROL_IMPULSADOR || rol === ROL_TEAMLEADER_IMPULSADOR;
}

/**
 * Limita "TODOS" al organigrama del creador. Las tareas históricas de los
 * módulos de repositores conservan su alcance global, pero no se filtran hacia
 * impulsadores; las selecciones explícitas se consideran salvo que un
 * superior haya quitado la tarea solamente para esa persona.
 */
export function filtroTareaGlobalVisiblePara(
  usuario: UsuarioVisibilidadTarea,
): Prisma.TareaGlobalWhereInput {
  const noExcluida: Prisma.TareaGlobalWhereInput = {
    exclusiones: { none: { usuarioId: usuario.id } },
  };
  const seleccionada: Prisma.TareaGlobalWhereInput = {
    destinatarios: { some: { usuarioId: usuario.id } },
  };

  if (perteneceOperacionImpulsadores(usuario.rolDescripcion)) {
    return {
      AND: [
        noExcluida,
        {
          OR: [
            seleccionada,
            {
              alcance: 'TODOS',
              OR: [
                { creadoPorId: usuario.id },
                {
                  creadoPor: {
                    is: { subordinados: { some: { id: usuario.id } } },
                  },
                },
                {
                  creadoPor: {
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

  return {
    AND: [
      noExcluida,
      {
        OR: [
          seleccionada,
          {
            alcance: 'TODOS',
            creadoPor: {
              is: {
                OR: [
                  { rol: { is: null } },
                  {
                    rol: {
                      is: {
                        descripcion: {
                          notIn: [...ROLES_GESTION_IMPULSADORES],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  };
}
