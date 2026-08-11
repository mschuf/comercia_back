import { IsOptional, Matches } from 'class-validator';

export class RendimientoImpulsadorDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;
}
