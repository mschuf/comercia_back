import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsInt,
  IsNumber,
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

export class IniciarVisitaDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  localId!: number;

  // Ubicación reportada por el dispositivo del usuario
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  precisionMetros?: number;

  @IsOptional()
  @IsString()
  @Length(16, 80)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  claveMovil?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  registradaEn?: string;
}

export class ActualizarVisitaTareaDto {
  @IsOptional()
  @IsBoolean()
  completada?: boolean;

  // undefined = no tocar; null o "" = limpiar
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(0, 500)
  comentario?: string | null;
}

export class FinalizarVisitaDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  precisionMetros?: number;

  @IsOptional()
  @IsString()
  @Length(16, 80)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  claveMovil?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  registradaEn?: string;
}

export class FinalizarVisitaMovilDto extends FinalizarVisitaDto {
  @IsString()
  @Length(16, 80)
  @Matches(/^[A-Za-z0-9._:-]+$/)
  entradaClaveMovil!: string;
}

export class ListarVisitasDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  localId?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha?: string;
}

export class ListarVisitasEquipoDto extends PaginacionDto {}
