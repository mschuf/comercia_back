import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginacionDto } from '../../common/utils/paginacion';
import { MAX_INT4 } from '../../common/utils/numeros';
import { trimString } from '../../common/utils/transforms';

export class ListarTareasGlobalesDto extends PaginacionDto {}

export class CrearTareaGlobalDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  titulo!: string;

  @IsString()
  @Transform(trimString)
  @Length(2, 300)
  descripcion!: string;

  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;
}

export class ActualizarTareaGlobalDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  titulo?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 300)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
