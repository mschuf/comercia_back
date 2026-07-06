// Normaliza texto para búsquedas: minúsculas y sin acentos
// ("Perú" → "peru", así "peru" lo encuentra)
export function normalizarBusqueda(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
