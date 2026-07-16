import { IsEnum, IsOptional, Matches } from 'class-validator';
import { PaginacionDto } from '../../common/utils/paginacion';

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

export enum AgrupacionKpiVisitaDto {
  USUARIO = 'USUARIO',
  LOCAL = 'LOCAL',
}

export class FiltroKpisVisitasDto {
  @IsOptional()
  @Matches(FECHA_ISO)
  desde?: string;

  @IsOptional()
  @Matches(FECHA_ISO)
  hasta?: string;
}

export class ListarKpisVisitasDto extends PaginacionDto {
  @IsEnum(AgrupacionKpiVisitaDto)
  agrupadoPor!: AgrupacionKpiVisitaDto;

  @IsOptional()
  @Matches(FECHA_ISO)
  desde?: string;

  @IsOptional()
  @Matches(FECHA_ISO)
  hasta?: string;
}
