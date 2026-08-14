import {
  filtroAlcanceLocalTarea,
  filtroTareaAplicableEnLocal,
  filtroTareaVisiblePara,
} from './visibilidad-tarea';

describe('visibilidad de tareas canónicas', () => {
  it('combina empresa, equipo e inclusión y siempre aplica la exclusión', () => {
    const filtro = filtroTareaVisiblePara({ id: 24 });
    const serializado = JSON.stringify(filtro);

    expect(serializado).toContain('"alcanceUsuarios":"EMPRESA"');
    expect(serializado).toContain('"alcanceUsuarios":"EQUIPO_DIRECTO"');
    expect(serializado).toContain('"alcanceUsuarios":"EQUIPO_COMPLETO"');
    expect(serializado).toContain('"efecto":"INCLUIR"');
    expect(serializado).toContain('"efecto":"EXCLUIR"');
    expect(serializado).toContain('"none":{"usuarioId":24');
    expect(serializado).toContain('"subordinados"');
  });

  it('resuelve el alcance por todos, cliente o selección de locales', () => {
    const filtro = filtroAlcanceLocalTarea({ id: 30, clienteId: 40 });

    expect(filtro).toEqual({
      OR: [
        { alcanceLocales: 'TODOS' },
        { alcanceLocales: 'CLIENTE', clienteId: 40 },
        {
          alcanceLocales: 'SELECCIONADOS',
          locales: { some: { localId: 30 } },
        },
      ],
    });
  });

  it('agrega actividad y vigencia al filtro operativo', () => {
    const ahora = new Date('2026-08-14T12:00:00.000Z');
    const filtro = filtroTareaAplicableEnLocal(
      { id: 24 },
      { id: 30, clienteId: 40 },
      ahora,
    );

    expect(filtro.activo).toBe(true);
    expect(JSON.stringify(filtro)).toContain(
      '"vigenteDesde":{"lte":"2026-08-14T12:00:00.000Z"}',
    );
    expect(JSON.stringify(filtro)).toContain(
      '"vigenteHasta":{"gte":"2026-08-14T12:00:00.000Z"}',
    );
  });
});
