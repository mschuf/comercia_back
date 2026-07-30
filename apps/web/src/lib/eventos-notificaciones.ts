export const EVENTO_NOTIFICACIONES_ACTUALIZADAS =
  "comercia:notificaciones-actualizadas";

export function notificarNotificacionesActualizadas(): void {
  window.dispatchEvent(new Event(EVENTO_NOTIFICACIONES_ACTUALIZADAS));
}
