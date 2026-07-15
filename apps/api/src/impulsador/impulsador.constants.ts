// Rutas de plataforma del módulo Impulsador (deben coincidir con las filas
// de modulos/paginas sembradas por la migración 20260708181000).
export const MODULO_IMPULSADOR = 'impulsador';
export const PAGINA_LOCALES = 'locales';
export const PAGINA_MAPA = 'mapa';
export const PAGINA_TAREAS = 'tareas';
export const PAGINA_VISITAS = 'visitas';

// Para endpoints compartidos entre vistas: alcanza con poder ver alguna.
export const PAGINAS_IMPULSADOR = [
  PAGINA_LOCALES,
  PAGINA_MAPA,
  PAGINA_TAREAS,
  PAGINA_VISITAS,
];

// Cotas de negocio
export const MAX_TAREAS_POR_LOCAL = 100;
export const RADIO_METROS_MIN = 10;
export const RADIO_METROS_MAX = 50_000;

// Fotos de visitas
export const FOTO_MAX_BYTES = 8 * 1024 * 1024;
export const FOTO_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
