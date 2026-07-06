// Forma estándar de toda respuesta paginada de la API de comercIA
// (ver "Reglas de paginación" en AGENTS.md)
export interface RespuestaPaginada<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
