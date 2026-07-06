import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  ValidateNested,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';

// Página específica visible para la empresa, con sus roles permitidos
export class PaginaAsignadaDto {
  @IsInt()
  @Max(MAX_INT4)
  paginaId!: number;

  // Roles que ven esta página; vacío u omitido = todos los roles
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Max(MAX_INT4, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(100)
  rolIds?: number[];
}

// Habilita/actualiza un módulo para una empresa
export class AsignarModuloDto {
  @IsInt()
  @Max(MAX_INT4)
  empresaId!: number;

  @IsInt()
  @Max(MAX_INT4)
  moduloId!: number;

  // true = ve todas las páginas del módulo; false = solo las de `paginas`
  @IsOptional()
  @IsBoolean()
  todasLasPaginas?: boolean;

  // Roles que ven el módulo dentro de la empresa; vacío u omitido = todos
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Max(MAX_INT4, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(100)
  rolIds?: number[];

  // Páginas específicas visibles (cuando todasLasPaginas es false)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaginaAsignadaDto)
  @ArrayMaxSize(500)
  paginas?: PaginaAsignadaDto[];
}
