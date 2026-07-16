export type CoordenadaRutaMapa = readonly [latitud: number, longitud: number];

function aRadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/**
 * Devuelve el giro CSS de un vehículo cuyo dibujo apunta originalmente al este.
 */
export function anguloVehiculoEnRuta(
  desde: CoordenadaRutaMapa,
  hasta: CoordenadaRutaMapa,
): number {
  if (desde[0] === hasta[0] && desde[1] === hasta[1]) return 0;

  const latitudInicial = aRadianes(desde[0]);
  const latitudFinal = aRadianes(hasta[0]);
  const diferenciaLongitud = aRadianes(hasta[1] - desde[1]);
  const y = Math.sin(diferenciaLongitud) * Math.cos(latitudFinal);
  const x =
    Math.cos(latitudInicial) * Math.sin(latitudFinal) -
    Math.sin(latitudInicial) *
      Math.cos(latitudFinal) *
      Math.cos(diferenciaLongitud);
  const rumboDesdeNorte = (Math.atan2(y, x) * 180) / Math.PI;

  return rumboDesdeNorte - 90;
}
