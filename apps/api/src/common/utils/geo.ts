// Utilidades de geografía (funciones puras, sin estado).

const RADIO_TIERRA_METROS = 6_371_000;

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

// Distancia entre dos coordenadas por fórmula de haversine. Precisión de
// sobra para radios de control de decenas/cientos de metros.
export function distanciaMetros(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = aRadianes(lat2 - lat1);
  const dLng = aRadianes(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(lat1)) *
      Math.cos(aRadianes(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(a));
}
