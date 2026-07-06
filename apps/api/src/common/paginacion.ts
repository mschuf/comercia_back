import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

// Paginación estándar de comercIA (ver "Reglas de paginación" en AGENTS.md):
// TODO endpoint de listado la usa. 7 registros por defecto, tope 50.
export const PAGINA_TAMANO_DEFECTO = 7;
export const PAGINA_TAMANO_MAXIMO = 50;

export class PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINA_TAMANO_MAXIMO)
  limit?: number;
}

export interface RespuestaPaginada<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// skip/take listos para pasarle a Prisma
export function rangoPaginacion(dto: PaginacionDto): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const limit = dto.limit ?? PAGINA_TAMANO_DEFECTO;
  const page = dto.page ?? 1;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function respuestaPaginada<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): RespuestaPaginada<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
