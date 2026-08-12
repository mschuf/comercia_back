// Rutas de plataforma para las operaciones de campo. Supervisor y Repositor
// comparten servicios, pero tienen módulos y menús independientes.
export const MODULO_SUPERVISOR = 'supervisor';
export const MODULO_SUPERVISOR_IMPULSADOR = 'supervisor-impulsador';
export const MODULO_REPOSITOR = 'repositor';
export const MODULO_TEAMLEADER_IMPULSADOR = 'teamleader-impulsador';
export const MODULO_IMPULSADOR = 'impulsador';
export const MODULOS_GESTION_CAMPO = [
  MODULO_SUPERVISOR_IMPULSADOR,
  MODULO_TEAMLEADER_IMPULSADOR,
  MODULO_SUPERVISOR,
];
export const MODULOS_OPERATIVOS_CAMPO = [MODULO_IMPULSADOR, MODULO_REPOSITOR];
export const MODULOS_OPERACION_CAMPO = [
  ...MODULOS_GESTION_CAMPO,
  ...MODULOS_OPERATIVOS_CAMPO,
];

export const PAGINA_CLIENTES = 'clientes';
export const PAGINA_EQUIPO = 'equipo';
export const PAGINA_MAPA = 'mapa';
export const PAGINA_TAREAS = 'tareas';
export const PAGINA_VISITAS = 'visitas';
export const PAGINA_ENTRADA = 'entrada';
export const PAGINA_LOCALES = 'locales';
export const PAGINA_MARCACIONES = 'marcaciones';
export const PAGINA_RENDIMIENTO = 'rendimiento';
export const PAGINA_PRESENTISMO = 'presentismo';

export const PAGINAS_REPOSITOR = [
  PAGINA_CLIENTES,
  PAGINA_LOCALES,
  PAGINA_TAREAS,
  PAGINA_VISITAS,
  PAGINA_ENTRADA,
  PAGINA_MARCACIONES,
  PAGINA_RENDIMIENTO,
];

export function paginasOperacionEquivalentes(paginaRuta: string): string[] {
  if (paginaRuta === PAGINA_CLIENTES) return [PAGINA_CLIENTES, PAGINA_LOCALES];
  if (paginaRuta === PAGINA_VISITAS) {
    return [
      PAGINA_VISITAS,
      PAGINA_ENTRADA,
      PAGINA_MARCACIONES,
      PAGINA_RENDIMIENTO,
    ];
  }
  return [paginaRuta];
}

// Cotas de negocio
export const MAX_TAREAS_POR_LOCAL = 100;
export const RADIO_METROS_MIN = 10;
export const RADIO_METROS_MAX = 50_000;
export const RADIO_METROS_DEFECTO = 200;

// Fotos de visitas
export const FOTO_MAX_BYTES = 8 * 1024 * 1024;
export const FOTO_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];
