export type PuntoMapa = [number, number];

const PRECISION_COORDENADA = 10_000_000;

function redondearCoordenada(valor: number): number {
  return Math.round(valor * PRECISION_COORDENADA) / PRECISION_COORDENADA;
}

export function centroPoligono(poligono: PuntoMapa[]): PuntoMapa | null {
  if (poligono.length === 0) return null;

  let latitudMinima = poligono[0][0];
  let latitudMaxima = poligono[0][0];
  let longitudMinima = poligono[0][1];
  let longitudMaxima = poligono[0][1];

  for (let indice = 1; indice < poligono.length; indice += 1) {
    const [latitud, longitud] = poligono[indice];
    latitudMinima = Math.min(latitudMinima, latitud);
    latitudMaxima = Math.max(latitudMaxima, latitud);
    longitudMinima = Math.min(longitudMinima, longitud);
    longitudMaxima = Math.max(longitudMaxima, longitud);
  }

  return [
    (latitudMinima + latitudMaxima) / 2,
    (longitudMinima + longitudMaxima) / 2,
  ];
}

export function trasladarPoligono(
  poligono: PuntoMapa[],
  nuevoCentro: PuntoMapa,
): PuntoMapa[] | null {
  const centroActual = centroPoligono(poligono);
  if (!centroActual) return null;

  const diferenciaLatitud = nuevoCentro[0] - centroActual[0];
  const diferenciaLongitud = nuevoCentro[1] - centroActual[1];
  const trasladado = poligono.map(([latitud, longitud]): PuntoMapa => [
    redondearCoordenada(latitud + diferenciaLatitud),
    redondearCoordenada(longitud + diferenciaLongitud),
  ]);

  const estaDentroDelMapa = trasladado.every(
    ([latitud, longitud]) =>
      latitud >= -90 && latitud <= 90 && longitud >= -180 && longitud <= 180,
  );

  return estaDentroDelMapa ? trasladado : null;
}
