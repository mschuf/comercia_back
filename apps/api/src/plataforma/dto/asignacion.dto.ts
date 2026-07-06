import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
} from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';

// Habilita/actualiza un módulo para una empresa
export class AsignarModuloDto {
  @IsInt()
  @Max(MAX_INT4)
  empresaId!: number;

  @IsInt()
  @Max(MAX_INT4)
  moduloId!: number;

  // true = ve todas las páginas del módulo; false = solo las de paginaIds
  @IsOptional()
  @IsBoolean()
  todasLasPaginas?: boolean;

  // Páginas específicas visibles cuando todasLasPaginas es false
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Max(MAX_INT4, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(500)
  paginaIds?: number[];
}
