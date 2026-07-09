// Validación profunda del polígono que llega por la API. class-validator solo
// garantiza "es un array"; acá se valida la forma real de los vértices.

export const MIN_VERTICES_POLIGONO = 3;
export const MAX_VERTICES_POLIGONO = 500;

// Vértices [lat, lng] del anillo exterior, en el orden en que se dibujaron.
export type Poligono = [number, number][];

export function esPoligonoValido(valor: unknown): valor is Poligono {
  if (!Array.isArray(valor)) {
    return false;
  }
  if (
    valor.length < MIN_VERTICES_POLIGONO ||
    valor.length > MAX_VERTICES_POLIGONO
  ) {
    return false;
  }
  return valor.every(
    (vertice) =>
      Array.isArray(vertice) &&
      vertice.length === 2 &&
      typeof vertice[0] === 'number' &&
      Number.isFinite(vertice[0]) &&
      vertice[0] >= -90 &&
      vertice[0] <= 90 &&
      typeof vertice[1] === 'number' &&
      Number.isFinite(vertice[1]) &&
      vertice[1] >= -180 &&
      vertice[1] <= 180,
  );
}
