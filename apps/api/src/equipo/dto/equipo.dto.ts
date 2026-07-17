import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { PaginacionDto } from '../../common/utils/paginacion';
import { trimString } from '../../common/utils/transforms';

export enum EstadoTareaEquipoDto {
  PENDIENTE = 'PENDIENTE',
  COMPLETADA = 'COMPLETADA',
}

export class ListarRepositoresEquipoDto extends PaginacionDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @MaxLength(100)
  buscar?: string;
}

export class ListarTareasEquipoDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  repositorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  localId?: number;

  @IsOptional()
  @IsEnum(EstadoTareaEquipoDto)
  estado?: EstadoTareaEquipoDto;
}
