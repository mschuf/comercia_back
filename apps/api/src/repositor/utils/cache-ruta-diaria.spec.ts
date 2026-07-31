import type { AgendaDiaria } from '../interfaces/agenda-diaria.interface';
import type { RutaDiariaDto } from '../interfaces/ruta-diaria.interface';
import {
  actualizarRutaGuardada,
  esRutaDiariaGuardada,
  firmaAgendaRuta,
} from './cache-ruta-diaria';

function agenda(overrides: Partial<AgendaDiaria> = {}): AgendaDiaria {
  return {
    fecha: '2026-07-30',
    totalProgramadas: 1,
    totalCompletadas: 0,
    candidatas: [
      {
        clave: '10-2026-07-30T13:00:00.000Z',
        programadaEn: new Date('2026-07-30T13:00:00.000Z'),
        visitaAbiertaId: null,
        local: {
          id: 10,
          nombre: 'Local Centro',
          cliente: { id: 20, nombre: 'Cliente Uno' },
          zona: 'Centro',
          latitud: -25.3,
          longitud: -57.6,
          tareasActivas: 2,
        },
      },
    ],
    ...overrides,
  };
}

const RUTA: RutaDiariaDto = {
  fecha: '2026-07-30',
  generadaEn: '2026-07-30T12:00:00.000Z',
  fuente: 'OSRM',
  usaUbicacionActual: true,
  totalProgramadas: 1,
  totalCompletadas: 0,
  distanciaTotalMetros: 100,
  duracionTrasladoSegundos: 30,
  ahorroEstimadoMetros: 20,
  geometria: [
    [-25.31, -57.61],
    [-25.3, -57.6],
  ],
  paradas: [
    {
      clave: '10-2026-07-30T13:00:00.000Z',
      orden: 1,
      local: {
        id: 10,
        nombre: 'Local Centro',
        cliente: { id: 20, nombre: 'Cliente Uno' },
        zona: 'Centro',
        latitud: -25.3,
        longitud: -57.6,
      },
      programadaEn: '2026-07-30T13:00:00.000Z',
      llegadaEstimada: '2026-07-30T12:30:00.000Z',
      distanciaDesdeAnteriorMetros: 100,
      viajeDesdeAnteriorSegundos: 30,
      tareasActivas: 2,
      estado: 'PENDIENTE',
      visitaAbiertaId: null,
    },
  ],
};

describe('cache de ruta diaria', () => {
  it('cambia la firma cuando cambia el estado operativo de la agenda', () => {
    const original = agenda();
    const conVisita = agenda({
      candidatas: [
        {
          ...original.candidatas[0],
          visitaAbiertaId: 50,
        },
      ],
    });

    expect(firmaAgendaRuta(original)).not.toBe(firmaAgendaRuta(conVisita));
  });

  it('actualiza el estado temporal sin recalcular geometría ni distancias', () => {
    const actualizada = actualizarRutaGuardada(
      RUTA,
      agenda(),
      new Date('2026-07-30T14:00:00.000Z'),
    );

    expect(actualizada.paradas[0].estado).toBe('ATRASADA');
    expect(actualizada.geometria).toEqual(RUTA.geometria);
    expect(actualizada.distanciaTotalMetros).toBe(100);
  });

  it('rechaza un JSON que no tiene la forma mínima de una ruta', () => {
    expect(esRutaDiariaGuardada({ fecha: '2026-07-30' })).toBe(false);
    expect(esRutaDiariaGuardada(RUTA)).toBe(true);
  });
});
