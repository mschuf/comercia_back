import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto';
import { MAX_INT4 } from '../../common/utils/numeros';
import { PaginacionDto } from '../../common/utils/paginacion';

export class ListarUsuariosDto extends PaginacionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  empresaId?: number;
}

export class CrearUsuarioDto extends RegisterDto {
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  rolId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  superiorId?: number | null;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  rolId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INT4)
  superiorId?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password?: string;
}
