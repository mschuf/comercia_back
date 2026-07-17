// Rutas de plataforma para las operaciones de campo. Supervisor y Repositor
// comparten servicios, pero tienen módulos y menús independientes.
export const MODULO_SUPERVISOR = 'supervisor';
export const MODULO_REPOSITOR = 'repositor';
export const MODULOS_OPERACION_CAMPO = [MODULO_SUPERVISOR, MODULO_REPOSITOR];

export const PAGINA_CLIENTES = 'clientes';
export const PAGINA_EQUIPO = 'equipo';
export const PAGINA_MAPA = 'mapa';
export const PAGINA_TAREAS = 'tareas';
export const PAGINA_VISITAS = 'visitas';

export const PAGINAS_REPOSITOR = [
  PAGINA_CLIENTES,
  PAGINA_TAREAS,
  PAGINA_VISITAS,
];

// Cotas de negocio
export const MAX_TAREAS_POR_LOCAL = 100;
export const RADIO_METROS_MIN = 10;
export const RADIO_METROS_MAX = 50_000;
export const RADIO_METROS_DEFECTO = 200;

// Fotos de visitas
export const FOTO_MAX_BYTES = 8 * 1024 * 1024;
export const FOTO_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
