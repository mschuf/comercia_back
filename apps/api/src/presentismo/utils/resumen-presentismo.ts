import {
  ROL_IMPULSADOR,
  ROL_SUPERVISOR_IMPULSADOR,
  ROL_TEAMLEADER_IMPULSADOR,
} from '../../common/constants/roles-negocio';
import type { UsuarioOperacionesCampo } from '../../impulsador/interfaces/usuario-operaciones-campo.interface';
import type {
  AcumuladoPresentismo,
  MetricaPresentismoDto,
  PerfilResumenInicioDto,
} from '../interfaces/presentismo.interface';
import type { PeriodoPresentismo } from './periodos-presentismo';

export function porcentajePresentismo(
  programadas: number,
  entradas: number,
): number {
  if (programadas === 0) return 0;
  return Math.round(Math.min(100, (entradas * 100) / programadas) * 10) / 10;
}

export function perfilResumenInicio(
  usuario: UsuarioOperacionesCampo,
): PerfilResumenInicioDto {
  if (usuario.rolDescripcion === ROL_SUPERVISOR_IMPULSADOR) {
    return 'SUPERVISOR';
  }
  if (usuario.rolDescripcion === ROL_TEAMLEADER_IMPULSADOR) {
    return 'TEAMLEADER';
  }
  if (usuario.rolDescripcion === ROL_IMPULSADOR) return 'IMPULSADOR';
  return usuario.esGestor ? 'GESTOR' : 'OPERATIVO';
}

export function totalPresentismo(
  datos: Map<number, AcumuladoPresentismo>,
  periodo: PeriodoPresentismo,
): MetricaPresentismoDto {
  const suma = [...datos.values()].reduce(
    (acc, valor) => ({
      programadas: acc.programadas + valor.programadas,
      entradas: acc.entradas + valor.entradas,
      salidas: acc.salidas + valor.salidas,
    }),
    { programadas: 0, entradas: 0, salidas: 0 },
  );
  return {
    ...periodo,
    ...suma,
    porcentaje: porcentajePresentismo(suma.programadas, suma.entradas),
  };
}
