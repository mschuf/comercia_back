import type { NotificacionSeleccionada } from '../interfaces/notificacion-seleccionada.interface';
import type { NotificacionTareaDto } from '../interfaces/notificacion.interface';

export function aNotificacionDto(
  notificacion: NotificacionSeleccionada,
): NotificacionTareaDto {
  const { visita } = notificacion.visitaTarea;
  return {
    id: notificacion.id,
    comentario: notificacion.comentario,
    reportadaEn: notificacion.reportadaEn.toISOString(),
    leidaEn: notificacion.leidaEn?.toISOString() ?? null,
    tarea: {
      visitaTareaId: notificacion.visitaTarea.id,
      titulo: notificacion.visitaTarea.tarea.titulo,
    },
    local: {
      id: visita.local.id,
      nombre: visita.local.nombre,
    },
    cliente: visita.local.cliente,
    repositor: {
      id: visita.usuario.id,
      nombre: `${visita.usuario.nombre} ${visita.usuario.apellido}`.trim(),
    },
  };
}
