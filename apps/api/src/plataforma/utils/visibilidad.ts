// Visibilidad por rol de la plataforma modular.
// Regla única (misma para menú y para autorización de datos):
// rolIds vacío = visible para TODOS los roles; si no, el rol del usuario
// debe estar incluido. Un usuario sin rol solo ve lo que es para todos.
export function rolVe(rolIds: number[], rolId: number | null): boolean {
  return rolIds.length === 0 || (rolId !== null && rolIds.includes(rolId));
}
