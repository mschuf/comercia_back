import { Transform, Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { trimString } from '../../common/utils/transforms';

export class ParametrosNovedadTareaDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  visitaTareaId!: number;
}

export class ReportarNovedadTareaDto {
  @IsString()
  @Transform(trimString)
  @Length(1, 500)
  comentario!: string;
}
