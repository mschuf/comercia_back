import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
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

export enum AlcanceTareaDto {
  // Alias compatible con clientes anteriores: el servicio lo normaliza.
  TODOS = 'TODOS',
  EMPRESA = 'EMPRESA',
  EQUIPO_DIRECTO = 'EQUIPO_DIRECTO',
  EQUIPO_COMPLETO = 'EQUIPO_COMPLETO',
  SELECCIONADOS = 'SELECCIONADOS',
}

export enum AlcanceLocalesTareaDto {
  TODOS = 'TODOS',
  CLIENTE = 'CLIENTE',
  SELECCIONADOS = 'SELECCIONADOS',
}

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

  @IsOptional()
  @IsEnum(AlcanceTareaDto)
  alcance?: AlcanceTareaDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  equipoRaizId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  usuarioIds?: number[];

  @IsOptional()
  @IsEnum(AlcanceLocalesTareaDto)
  alcanceLocales?: AlcanceLocalesTareaDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  clienteId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  localIds?: number[];

  @IsOptional()
  @IsDateString()
  vigenteDesde?: string | null;

  @IsOptional()
  @IsDateString()
  vigenteHasta?: string | null;
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

  @IsOptional()
  @IsEnum(AlcanceTareaDto)
  alcance?: AlcanceTareaDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  equipoRaizId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  usuarioIds?: number[];

  @IsOptional()
  @IsEnum(AlcanceLocalesTareaDto)
  alcanceLocales?: AlcanceLocalesTareaDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  clienteId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  localIds?: number[];

  @IsOptional()
  @IsDateString()
  vigenteDesde?: string | null;

  @IsOptional()
  @IsDateString()
  vigenteHasta?: string | null;
}
