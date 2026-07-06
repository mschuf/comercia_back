import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { MotorBd, TipoEjecutable } from '../../../generated/prisma/client';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CrearEjecutableDto {
  @IsInt()
  @Max(MAX_INT4)
  paginaId!: number;

  @IsString()
  @Transform(trim)
  @Length(2, 80)
  nombre!: string;

  @IsEnum(TipoEjecutable)
  tipo!: TipoEjecutable;

  @IsEnum(MotorBd)
  motor!: MotorBd;

  // null = base propia de comercIA; si no, apunta a una Conexion externa
  @IsOptional()
  @IsInt()
  @Max(MAX_INT4)
  conexionId?: number | null;

  @IsString()
  @Transform(trim)
  @Length(1, 4000)
  sentencia!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

export class ActualizarEjecutableDto {
  @IsOptional()
  @IsString()
  @Transform(trim)
  @Length(2, 80)
  nombre?: string;

  @IsOptional()
  @IsEnum(TipoEjecutable)
  tipo?: TipoEjecutable;

  @IsOptional()
  @IsEnum(MotorBd)
  motor?: MotorBd;

  @IsOptional()
  @IsInt()
  @Max(MAX_INT4)
  conexionId?: number | null;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @Length(1, 4000)
  sentencia?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_INT4)
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
