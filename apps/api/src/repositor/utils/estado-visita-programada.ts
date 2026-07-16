import type { EstadoParadaRuta } from '../interfaces/ruta-diaria.interface';

export function estadoVisitaProgramada(
  programadaEn: Date,
  visitaAbiertaId: number | null,
  ahora: Date,
): EstadoParadaRuta {
  if (visitaAbiertaId !== null) return 'EN_CURSO';
  return ahora.getTime() > programadaEn.getTime() ? 'ATRASADA' : 'PENDIENTE';
}
