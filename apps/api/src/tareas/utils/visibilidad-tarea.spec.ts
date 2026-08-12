import {
  ROL_IMPULSADOR,
  ROL_REPOSITOR,
} from '../../common/constants/roles-negocio';
import { filtroTareaGlobalVisiblePara } from './visibilidad-tarea';

describe('filtroTareaGlobalVisiblePara', () => {
  it('restringe las tareas globales del impulsador a sus superiores', () => {
    const filtro = filtroTareaGlobalVisiblePara({
      id: 24,
      rolDescripcion: ROL_IMPULSADOR,
    });
    const serializado = JSON.stringify(filtro);
    expect(serializado).toContain('"usuarioId":24');
    expect(serializado).toContain('"alcance":"TODOS"');
    expect(serializado).toContain('"subordinados"');
  });

  it('excluye del alcance global legado a los gestores de impulsadores', () => {
    const filtro = filtroTareaGlobalVisiblePara({
      id: 8,
      rolDescripcion: ROL_REPOSITOR,
    });
    expect(JSON.stringify(filtro)).toContain('notIn');
    expect(JSON.stringify(filtro)).toContain('supervisor.impulsador');
    expect(JSON.stringify(filtro)).toContain('teamleader.impulsador');
  });
});
