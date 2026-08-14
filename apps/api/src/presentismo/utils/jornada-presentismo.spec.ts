import type {
  LocalJornadaPresentismo,
  VisitaJornadaPresentismo,
} from '../interfaces/presentismo.interface';
import { construirJornadaPresentismo } from './jornada-presentismo';

function local(
  id: number,
  fechaVisita: Date | null,
): LocalJornadaPresentismo {
  return {
    id,
    nombre: `Local ${id}`,
    cliente: { nombre: `Cliente ${id}` },
    fechaVisita,
    programacionVisita: null,
  };
}

function visita(
  id: number,
  localId: number,
  iniciadaEn: Date,
  completadaEn: Date | null,
): VisitaJornadaPresentismo {
  return {
    id,
    localId,
    iniciadaEn,
    completadaEn,
    local: {
      id: localId,
      nombre: `Local ${localId}`,
      cliente: { nombre: `Cliente ${localId}` },
    },
  };
}

describe('jornada de presentismo', () => {
  it('muestra horarios, visitas realizadas y marcaciones fuera de agenda', () => {
    const detalle = construirJornadaPresentismo(
      [
        local(1, new Date('2026-08-17T12:00:00.000Z')),
        local(2, new Date('2026-08-17T13:00:00.000Z')),
        local(3, new Date('2026-08-17T15:00:00.000Z')),
      ],
      [
        visita(
          11,
          1,
          new Date('2026-08-17T12:10:00.000Z'),
          new Date('2026-08-17T12:45:00.000Z'),
        ),
        visita(12, 4, new Date('2026-08-17T14:00:00.000Z'), null),
      ],
      '2026-08-17',
      new Date('2026-08-17T14:30:00.000Z'),
    );

    expect(detalle).toEqual([
      expect.objectContaining({
        local: expect.objectContaining({ id: 1 }),
        entradaEn: '2026-08-17T12:10:00.000Z',
        salidaEn: '2026-08-17T12:45:00.000Z',
        estado: 'COMPLETADA',
      }),
      expect.objectContaining({
        local: expect.objectContaining({ id: 2 }),
        entradaEn: null,
        estado: 'ATRASADA',
      }),
      expect.objectContaining({
        local: expect.objectContaining({ id: 4 }),
        programadaEn: null,
        entradaEn: '2026-08-17T14:00:00.000Z',
        estado: 'EN_CURSO',
      }),
      expect.objectContaining({
        local: expect.objectContaining({ id: 3 }),
        entradaEn: null,
        estado: 'PENDIENTE',
      }),
    ]);
  });
});
