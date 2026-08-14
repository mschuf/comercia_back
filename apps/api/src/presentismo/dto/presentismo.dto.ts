import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { PaginacionDto } from '../../common/utils/paginacion';
import { trimString } from '../../common/utils/transforms';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export class ResumenPresentismoQueryDto {
  @IsOptional()
  @Matches(FECHA_ISO)
  fecha?: string;
}

export class ListarPresentismoDto extends PaginacionDto {
  @Matches(FECHA_ISO)
  desde!: string;

  @Matches(FECHA_ISO)
  hasta!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  usuarioId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  teamleaderId?: number;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  @MaxLength(100)
  buscar?: string;
}

export class ListarJornadaPresentismoDto extends PaginacionDto {
  @Matches(FECHA_ISO)
  fecha!: string;
}
