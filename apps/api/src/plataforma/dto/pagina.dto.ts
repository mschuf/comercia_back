import { Transform } from 'class-transformer';
import { lowerTrimString, trimString } from '../../common/utils/transforms';
import {
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

const rutaRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CrearPaginaDto {
  @IsInt()
  @Max(MAX_INT4)
  moduloId!: number;

  @IsString()
  @Transform(trimString)
  @Length(2, 60)
  nombre!: string;

  @IsString()
  @Transform(lowerTrimString)
  @Matches(rutaRegex, {
    message: 'la ruta debe ser en minúsculas, sin espacios (ej: "listado")',
  })
  @Length(2, 40)
  ruta!: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(1, 40)
  icono?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ActualizarPaginaDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 60)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Transform(lowerTrimString)
  @Matches(rutaRegex, {
    message: 'la ruta debe ser en minúsculas, sin espacios (ej: "listado")',
  })
  @Length(2, 40)
  ruta?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(0, 40)
  icono?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
