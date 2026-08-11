/*
 * Hallmark · modern-minimal · utilitario · ancla verde azulado
 * Macroestructura: estado operativo primero, acción única, sincronización aparte
 */
export const colores = {
  fondo: "#071F2A",
  fondoElevado: "#0B2A37",
  tarjeta: "#F7FAF9",
  tarjetaSuave: "#EDF4F2",
  texto: "#102E3C",
  textoSecundario: "#516A74",
  textoSobreOscuro: "#F6FAFB",
  textoSobreOscuroSecundario: "#B9CDD3",
  borde: "#CCD9DC",
  bordeSobreOscuro: "#214553",
  primario: "#087E8B",
  primarioPresionado: "#066873",
  acento: "#43D4A0",
  acentoSuave: "#DFF4EC",
  exito: "#16865F",
  advertencia: "#9A6412",
  advertenciaSuave: "#FFF0CF",
  indicadorAdvertencia: "#F4B95B",
  peligro: "#B44643",
  peligroPresionado: "#963B39",
  errorFondo: "#4A2528",
  errorTexto: "#FFDAD7",
  textoAviso: "#285D51",
  textoPlaceholder: "#617983",
  inactivo: "#93A7AE",
  blanco: "#FFFFFF",
} as const;

export const radios = {
  pequeno: 10,
  medio: 14,
  grande: 20,
  redondo: 999,
} as const;

export const espacios = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const anchoMaximoContenido = 560;
