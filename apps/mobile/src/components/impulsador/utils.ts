import * as Location from "expo-location";
import { ErrorApi } from "../../lib/api";
import { nuevaClaveMarcacion } from "../../lib/cola-marcaciones";
import type { CoordenadasMarcacion } from "../../types/impulsador";

export function mensajeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  if (error instanceof Error) {
    if (/fetch failed|network request|unknownhost|resolve host/i.test(error.message)) {
      return "No hay internet. Guardamos la marcación en este teléfono para enviarla cuando vuelva la señal.";
    }
    return error.message;
  }
  return "No pudimos completar la acción.";
}

export function fechaHora(valor: string | null): string {
  if (!valor) return "Pendiente";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

export function distanciaMetros(
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number,
): number {
  const radioTierra = 6_371_000;
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const deltaLatitud = aRadianes(latitud2 - latitud1);
  const deltaLongitud = aRadianes(longitud2 - longitud1);
  const a =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(aRadianes(latitud1)) *
      Math.cos(aRadianes(latitud2)) *
      Math.sin(deltaLongitud / 2) ** 2;
  return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function leerUbicacion(
  usuarioId: number,
  tipo: "ENTRADA" | "SALIDA",
): Promise<CoordenadasMarcacion> {
  const servicios = await Location.hasServicesEnabledAsync();
  if (!servicios) {
    throw new Error("Activá la ubicación del teléfono para marcar.");
  }
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (permiso.status !== "granted") {
    throw new Error("Permití la ubicación para confirmar que estás en el local.");
  }
  const ubicacion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitud: ubicacion.coords.latitude,
    longitud: ubicacion.coords.longitude,
    precisionMetros: ubicacion.coords.accuracy ?? undefined,
    registradaEn: new Date(ubicacion.timestamp).toISOString(),
    claveMovil: nuevaClaveMarcacion(usuarioId, tipo),
  };
}
