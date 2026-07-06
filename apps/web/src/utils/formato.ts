// Formatos de números y montos de comercIA

// Millones de guaraníes abreviados: 152 → "₲ 152 M"
export function formatoGuaraniesMillones(valor: number): string {
  return `₲ ${valor} M`;
}
