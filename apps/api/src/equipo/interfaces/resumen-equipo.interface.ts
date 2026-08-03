// Datos operativos acotados al equipo directo del supervisor. No expone
// personas, contactos ni detalle de tareas: el dashboard solo necesita conteos.
export interface ResumenEquipoDto {
  miembros: number;
  visitasEnCurso: number;
  tareasPendientes: number;
  novedadesSinLeer: number;
}
