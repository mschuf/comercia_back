import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { trimString } from '../../common/utils/transforms';

export class CrearLocalDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud!: number;

  // Impulsador al que se asigna el local (opcional)
  @IsOptional()
  @IsInt()
  @Max(MAX_INT4)
  usuarioId?: number | null;
}

export class ActualizarLocalDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud?: number;

  @IsOptional()
  @IsInt()
  @Max(MAX_INT4)
  usuarioId?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
