import type {
  AlcanceLocalesTarea,
  AlcanceUsuariosTarea,
} from '@/types/tarea';

const ETIQUETAS_USUARIOS: Record<AlcanceUsuariosTarea, string> = {
  EMPRESA: 'Toda la empresa',
  EQUIPO_DIRECTO: 'Equipo directo',
  EQUIPO_COMPLETO: 'Equipo completo',
  SELECCIONADOS: 'Personas elegidas',
};

const ETIQUETAS_LOCALES: Record<AlcanceLocalesTarea, string> = {
  TODOS: 'Todos los locales',
  CLIENTE: 'Todo un cliente',
  SELECCIONADOS: 'Locales elegidos',
};

export function etiquetaAlcanceUsuarios(
  alcance: AlcanceUsuariosTarea,
): string {
  return ETIQUETAS_USUARIOS[alcance];
}

export function etiquetaAlcanceLocales(
  alcance: AlcanceLocalesTarea,
): string {
  return ETIQUETAS_LOCALES[alcance];
}

function dosDigitos(valor: number): string {
  return valor.toString().padStart(2, '0');
}

export function fechaHoraParaInput(fecha: string | null): string {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return `${valor.getFullYear()}-${dosDigitos(valor.getMonth() + 1)}-${dosDigitos(valor.getDate())}T${dosDigitos(valor.getHours())}:${dosDigitos(valor.getMinutes())}`;
}

export function fechaHoraParaApi(fecha: string): string | null {
  if (!fecha) return null;
  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
}
