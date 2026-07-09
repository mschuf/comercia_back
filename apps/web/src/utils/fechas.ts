// Helpers de fechas (funciones puras).
//
// La fecha de visita programada viaja a la API como ISO con hora 12:00Z:
// anclarla al mediodía UTC evita que el día se corra al mostrarla en
// cualquier huso horario (Paraguay es UTC-3/-4).

export function fechaInputAIso(fecha: string): string | null {
  if (!fecha) return null;
  return `${fecha}T12:00:00.000Z`;
}

export function isoAFechaInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function formatoFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatoFechaHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatoFecha(iso)} ${d.toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
