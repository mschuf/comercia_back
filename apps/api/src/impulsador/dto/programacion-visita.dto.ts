import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsDateString,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export enum FrecuenciaVisitaDto {
  UNICA = 'UNICA',
  SEMANAL = 'SEMANAL',
  MENSUAL = 'MENSUAL',
}

const FECHA_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HORA_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class GuardarProgramacionVisitaDto {
  @IsEnum(FrecuenciaVisitaDto)
  frecuencia!: FrecuenciaVisitaDto;

  @IsString()
  @Matches(FECHA_PATTERN)
  @IsDateString({ strict: true })
  fechaInicio!: string;

  @IsOptional()
  @IsString()
  @Matches(FECHA_PATTERN)
  @IsDateString({ strict: true })
  fechaFin?: string | null;

  @IsInt()
  @Min(1)
  @Max(12)
  intervalo!: number;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  diasSemana!: number[];

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(31)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(31, { each: true })
  diasMes!: number[];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(HORA_PATTERN, { each: true })
  horarios!: string[];

  @IsString()
  @Length(1, 80)
  zonaHoraria!: string;

  @IsBoolean()
  activo!: boolean;
}
