const ZONA_HORARIA_MARCACIONES = "America/Asuncion";

function fechaIsoEnZona(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_MARCACIONES,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

export function esJornadaDeDiaAnterior(
  iniciadaEn: string,
  ahora = new Date(),
): boolean {
  const fecha = new Date(iniciadaEn);
  return !Number.isNaN(fecha.getTime()) && fechaIsoEnZona(fecha) < fechaIsoEnZona(ahora);
}

export function formatoFechaHoraCorta(valor: string): string {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}
