import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';

export class IdNotificacionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  id!: number;
}
