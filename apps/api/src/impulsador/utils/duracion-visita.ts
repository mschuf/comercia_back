import { redondear1Decimal } from '../../common/utils/numeros';

export function duracionVisitaMinutos(
  iniciadaEn: Date,
  completadaEn: Date | null,
): number | null {
  if (completadaEn === null) return null;
  return redondear1Decimal(
    Math.max(0, completadaEn.getTime() - iniciadaEn.getTime()) / 60_000,
  );
}
