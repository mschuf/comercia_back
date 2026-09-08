import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarRolDto, CrearRolDto, ListarRolesDto } from './rol.dto';

describe('DTOs de roles por empresa', () => {
  it.each([undefined, null, 0, -1, 1.5, 'abc', 2147483648])(
    'requiere una empresa válida: %s',
    async (empresaId) => {
      const errores = await validate(
        plainToInstance(CrearRolDto, { empresaId, descripcion: 'Gerente' }),
      );
      expect(errores.some((error) => error.property === 'empresaId')).toBe(
        true,
      );
    },
  );

  it('no permite cambiar de empresa al editar', async () => {
    const errores = await validate(
      plainToInstance(ActualizarRolDto, { empresaId: 30 }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errores.some((error) => error.property === 'empresaId')).toBe(true);
  });

  it('valida el filtro y la paginación', async () => {
    expect(
      await validate(
        plainToInstance(ListarRolesDto, {
          empresaId: '20',
          page: '2',
          limit: '7',
        }),
      ),
    ).toEqual([]);
    expect(
      await validate(
        plainToInstance(ListarRolesDto, { empresaId: -1, limit: 51 }),
      ),
    ).toHaveLength(2);
  });
});
