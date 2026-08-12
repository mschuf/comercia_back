import type { UsuarioOperacionesCampo } from '../../impulsador/interfaces/usuario-operaciones-campo.interface';
import {
  perfilResumenInicio,
  porcentajePresentismo,
  totalPresentismo,
} from './resumen-presentismo';

function usuario(
  rolDescripcion: string,
  esGestor: boolean,
): UsuarioOperacionesCampo {
  return {
    id: 1,
    empresaId: 1,
    rolId: 1,
    rolDescripcion,
    esGestor,
    esOperativo: !esGestor,
  };
}

describe('resumen de presentismo para inicio', () => {
  it('reconoce los tres perfiles de impulsadores', () => {
    expect(perfilResumenInicio(usuario('supervisor.impulsador', true))).toBe(
      'SUPERVISOR',
    );
    expect(perfilResumenInicio(usuario('teamleader.impulsador', true))).toBe(
      'TEAMLEADER',
    );
    expect(perfilResumenInicio(usuario('impulsador', false))).toBe(
      'IMPULSADOR',
    );
  });

  it('limita el porcentaje a 100 y conserva un decimal', () => {
    expect(porcentajePresentismo(3, 2)).toBe(66.7);
    expect(porcentajePresentismo(1, 2)).toBe(100);
    expect(porcentajePresentismo(0, 0)).toBe(0);
  });

  it('acumula entradas, salidas y programaciones del alcance', () => {
    const resumen = totalPresentismo(
      new Map([
        [1, { programadas: 2, entradas: 1, salidas: 1 }],
        [2, { programadas: 3, entradas: 3, salidas: 2 }],
      ]),
      { desde: '2026-08-12', hasta: '2026-08-12' },
    );

    expect(resumen).toEqual({
      desde: '2026-08-12',
      hasta: '2026-08-12',
      programadas: 5,
      entradas: 4,
      salidas: 3,
      porcentaje: 80,
    });
  });
});
