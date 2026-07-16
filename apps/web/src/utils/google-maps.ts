import type { ParadaRuta } from "@/types/repositor";

function coordenada(latitud: number, longitud: number): string {
  return `${latitud},${longitud}`;
}

export function urlNavegarA(parada: Pick<ParadaRuta, "local">): string {
  const destino = coordenada(parada.local.latitud, parada.local.longitud);
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}&travelmode=driving&dir_action=navigate`;
}

export function urlRutaCompleta(
  paradas: ParadaRuta[],
  origen?: { latitud: number; longitud: number } | null,
): string | null {
  if (paradas.length === 0) return null;
  const destino = paradas.at(-1)!;
  const intermedias = paradas.slice(0, -1).slice(0, 3);
  const parametros = new URLSearchParams({
    api: "1",
    destination: coordenada(destino.local.latitud, destino.local.longitud),
    travelmode: "driving",
    dir_action: "navigate",
  });
  if (origen) {
    parametros.set("origin", coordenada(origen.latitud, origen.longitud));
  }
  if (intermedias.length > 0) {
    parametros.set(
      "waypoints",
      intermedias
        .map(({ local }) => coordenada(local.latitud, local.longitud))
        .join("|"),
    );
  }
  return `https://www.google.com/maps/dir/?${parametros.toString()}`;
}
