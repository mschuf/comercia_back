export const EVENTO_PLATAFORMA_ACTUALIZADA =
  'comercia:plataforma-actualizada';

export function notificarPlataformaActualizada(): void {
  window.dispatchEvent(new Event(EVENTO_PLATAFORMA_ACTUALIZADA));
}
