import { Transform, Type } from 'class-transformer';
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
}

export class ListarVisitasDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  localId?: number;
}
