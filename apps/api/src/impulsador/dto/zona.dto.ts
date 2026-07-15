import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { PaginacionDto } from '../../common/utils/paginacion';
import { trimString } from '../../common/utils/transforms';

const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

export class CrearZonaDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1, { message: 'Solo se puede asignar un repositor por zona' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  usuarioIds?: number[];

  // Territorio al que pertenece la zona (obligatorio: la jerarquía es
  // territorio > zona > local)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  territorioId!: number;

  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @Matches(COLOR_HEX, { message: 'color debe ser un hex #rrggbb' })
  color?: string;

  @IsOptional()
  @IsArray()
  poligono?: unknown[] | null;
}

export class ActualizarZonaDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1, { message: 'Solo se puede asignar un repositor por zona' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  usuarioIds?: number[];

  // Una zona siempre pertenece a un territorio (no admite null)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  territorioId?: number;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(COLOR_HEX, { message: 'color debe ser un hex #rrggbb' })
  color?: string;

  // undefined = no tocar; null = quitar la delimitación
  @IsOptional()
  @IsArray()
  poligono?: unknown[] | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ListarZonasDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  territorioId?: number;
}
