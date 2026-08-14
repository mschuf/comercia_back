export type AlcanceUsuariosTareaValor =
  'EMPRESA' | 'EQUIPO_DIRECTO' | 'EQUIPO_COMPLETO' | 'SELECCIONADOS';

export type AlcanceLocalesTareaValor = 'TODOS' | 'CLIENTE' | 'SELECCIONADOS';

export interface AlcanceUsuariosResuelto {
  alcanceUsuarios: AlcanceUsuariosTareaValor;
  equipoRaizId: number | null;
  destinatarios: number[];
}

export interface AlcanceLocalesResuelto {
  alcanceLocales: AlcanceLocalesTareaValor;
  clienteId: number | null;
  locales: number[];
}
