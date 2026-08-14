import type { Prisma } from '../../../generated/prisma/client';
import type { TareaLocalDto } from '../interfaces/tarea-local.interface';

export const SELECT_TAREA_LOCAL = {
  id: true,
  titulo: true,
  descripcion: true,
  requiereFoto: true,
  orden: true,
  activo: true,
} satisfies Prisma.TareaSelect;

type TareaLocalSeleccionada = Prisma.TareaGetPayload<{
  select: typeof SELECT_TAREA_LOCAL;
}>;

export function aTareaLocalDto(tarea: TareaLocalSeleccionada): TareaLocalDto {
  return {
    id: tarea.id,
    titulo: tarea.titulo,
    descripcion: tarea.descripcion,
    requiereFoto: tarea.requiereFoto,
    orden: tarea.orden,
    activo: tarea.activo,
  };
}
