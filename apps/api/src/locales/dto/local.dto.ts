import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
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

// Cotas del radio de verificación (espejo de impulsador.constants)
const RADIO_MIN = 10;
const RADIO_MAX = 50_000;

export class ListarLocalesDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  clienteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  usuarioId?: number;
}

export class CrearLocalDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  clienteId!: number;

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

  // Todo local pertenece a una zona.
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  zonaId!: number;

  // Radio en metros para verificar presencia; null = default de la config
  @IsOptional()
  @IsInt()
  @Min(RADIO_MIN)
  @Max(RADIO_MAX)
  radioMetros?: number | null;

  // Próxima visita programada (ISO 8601)
  @IsOptional()
  @IsISO8601()
  fechaVisita?: string | null;

  // Exigir foto de presencia al finalizar la visita
  @IsOptional()
  @IsBoolean()
  requiereFotoPresencia?: boolean;

  // Repositor asignado al local y habilitado en la zona.
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  usuarioId!: number;
}

export class ActualizarLocalDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  clienteId?: number;

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

  // undefined = no tocar; null = quitar de la zona
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  zonaId?: number | null;

  // undefined = no tocar; null = volver al default de la config
  @IsOptional()
  @IsInt()
  @Min(RADIO_MIN)
  @Max(RADIO_MAX)
  radioMetros?: number | null;

  // undefined = no tocar; null = sin visita programada
  @IsOptional()
  @IsISO8601()
  fechaVisita?: string | null;

  @IsOptional()
  @IsBoolean()
  requiereFotoPresencia?: boolean;

  @IsOptional()
  @IsInt()
  @Max(MAX_INT4)
  usuarioId?: number | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
