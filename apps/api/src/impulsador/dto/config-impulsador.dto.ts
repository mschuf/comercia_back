import { IsArray, IsInt, IsOptional, Max, Min } from 'class-validator';
import { MAX_INT4 } from '../../common/utils/numeros';
import { RADIO_METROS_MAX, RADIO_METROS_MIN } from '../impulsador.constants';

export class ActualizarConfigImpulsadorDto {
  // Roles que gestionan el módulo (vacío = fallback por descripción de rol)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  rolGestorIds?: number[];

  // Roles que realizan visitas (vacío = cualquier usuario asignado)
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  rolOperativoIds?: number[];

  // Roles que administran usuarios de su propia empresa.
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(MAX_INT4, { each: true })
  rolAdminUsuarioIds?: number[];

  @IsOptional()
  @IsInt()
  @Min(RADIO_METROS_MIN)
  @Max(RADIO_METROS_MAX)
  radioMetrosDefecto?: number;
}
