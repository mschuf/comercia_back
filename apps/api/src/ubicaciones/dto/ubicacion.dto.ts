import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginacionDto } from '../../common/utils/paginacion';

export class ActualizarConsentimientoUbicacionDto {
  @IsBoolean()
  aceptado!: boolean;

  @IsString()
  @Length(1, 50)
  versionPolitica!: string;
}

export class RegistrarUbicacionDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitud!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitud!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100_000)
  precisionMetros?: number;

  @IsDateString({}, { message: 'registradaEn debe ser una fecha ISO 8601' })
  registradaEn!: string;
}

export class ListarUbicacionesDto extends PaginacionDto {}
