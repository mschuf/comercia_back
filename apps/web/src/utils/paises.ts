import { getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { PaisItem } from "@/types/pais";

// El servidor renderiza solo Paraguay (determinístico) y el navegador la lista
// completa: Intl.DisplayNames traduce/ordena distinto en Node y en cada navegador,
// así que generarla en ambos lados provocaba errores de hidratación.
export const PAIS_INICIAL: PaisItem[] = [
  { codigo: "PY", nombre: "Paraguay", prefijo: "595" },
];

let cachePaises: PaisItem[] | null = null;

export function listaCompletaDePaises(): PaisItem[] {
  if (cachePaises) {
    return cachePaises;
  }
  const nombres = new Intl.DisplayNames(["es"], { type: "region" });
  const paises = getCountries().map((codigo) => ({
    codigo,
    nombre: nombres.of(codigo) ?? codigo,
    prefijo: getCountryCallingCode(codigo),
  }));
  paises.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  cachePaises = [
    ...paises.filter((p) => p.codigo === "PY"),
    ...paises.filter((p) => p.codigo !== "PY"),
  ];
  return cachePaises;
}
