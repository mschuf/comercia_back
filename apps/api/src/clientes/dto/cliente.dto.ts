import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { PaginacionDto } from '../../common/utils/paginacion';
import { trimString } from '../../common/utils/transforms';

export class ListarClientesDto extends PaginacionDto {}

export class CrearClienteDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre!: string;
}

export class ActualizarClienteDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
