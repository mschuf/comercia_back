import type { CountryCode } from "libphonenumber-js";

// Ítem del selector de país (código ISO, nombre en español y prefijo telefónico)
export interface PaisItem {
  codigo: CountryCode;
  nombre: string;
  prefijo: string;
}
