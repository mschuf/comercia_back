// Formatos de números y montos de comercIA

// Millones de guaraníes abreviados: 152 → "₲ 152 M"
export function formatoGuaraniesMillones(valor: number): string {
  return `₲ ${valor} M`;
}

// Fecha y hora local corta y determinista (sin Intl): "06/07/2026 14:35"
export function formatoFechaHora(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Coordenada con 6 decimales (≈10 cm de precisión): -25.286700
export function formatoCoordenada(valor: number): string {
  return valor.toFixed(6);
}
