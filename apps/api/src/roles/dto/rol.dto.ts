import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';

export class CrearRolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  descripcion!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  rolId?: number | null;
}

export class ActualizarRolDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  rolId?: number | null;
}
