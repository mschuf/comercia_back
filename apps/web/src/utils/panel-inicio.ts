import type { ModuloMenu } from "@/types/plataforma";

export interface DestinoPanel {
  modulo: string;
  pagina: string;
}

const MODULOS_OPERACION = new Set([
  "supervisor",
  "supervisor-impulsador",
  "teamleader-impulsador",
  "repositor",
  "impulsador",
]);

export function tieneOperacionCampo(modulos: ModuloMenu[]): boolean {
  return modulos.some((modulo) => MODULOS_OPERACION.has(modulo.ruta));
}

export function hrefDisponible(
  modulos: ModuloMenu[],
  destinos: readonly DestinoPanel[],
): string | null {
  for (const destino of destinos) {
    const disponible = modulos.some(
      (modulo) =>
        modulo.ruta === destino.modulo &&
        modulo.paginas.some((pagina) => pagina.ruta === destino.pagina),
    );
    if (disponible) return `/panel/${destino.modulo}/${destino.pagina}`;
  }
  return null;
}
