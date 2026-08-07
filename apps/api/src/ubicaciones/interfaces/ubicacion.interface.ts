export interface ConsentimientoUbicacionDto {
  activo: boolean;
  otorgadoEn: string | null;
  versionPolitica: string | null;
}

export interface UbicacionDto {
  id: number;
  latitud: number;
  longitud: number;
  precisionMetros: number | null;
  registradaEn: string;
  recibidaEn: string;
}
