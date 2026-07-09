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
import { MAX_INT4 } from '../../common/utils/numeros';
import { trimString } from '../../common/utils/transforms';

export class CrearTareaLocalDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 300)
  descripcion!: string;

  // Habilita la cámara para esta tarea durante la visita
  @IsOptional()
  @IsBoolean()
  requiereFoto?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;
}

export class ActualizarTareaLocalDto {
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
