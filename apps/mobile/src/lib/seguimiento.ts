import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import {
  actualizarConsentimientoUbicacion,
  ErrorApi,
  registrarUbicacion,
} from "./api";
import { obtenerSesion } from "./sesion";

export const NOMBRE_TAREA_UBICACION = "comercia.seguimiento.ubicacion";
const CLAVE_SEGUIMIENTO_ACTIVO = "comercia.mobile.seguimiento.activo";
const CLAVE_ULTIMO_ENVIO = "comercia.mobile.seguimiento.ultimo-envio";
const INTERVALO_MS = 60_000;

type DatosTareaUbicacion = { locations: Location.LocationObject[] };

function sonDatosDeUbicacion(datos: unknown): datos is DatosTareaUbicacion {
  return (
    typeof datos === "object" &&
    datos !== null &&
    "locations" in datos &&
    Array.isArray(datos.locations)
  );
}

async function registrarLote(
  ubicaciones: Location.LocationObject[],
): Promise<void> {
  const sesion = await obtenerSesion();
  if (!sesion) return;

  const ultimoEnvio = Number(
    (await SecureStore.getItemAsync(CLAVE_ULTIMO_ENVIO)) ?? "0",
  );
  let enviadoHasta = ultimoEnvio;

  try {
    for (const ubicacion of ubicaciones) {
      if (ubicacion.timestamp - enviadoHasta < INTERVALO_MS) continue;

      await registrarUbicacion(sesion.token, {
        latitud: ubicacion.coords.latitude,
        longitud: ubicacion.coords.longitude,
        precisionMetros: ubicacion.coords.accuracy ?? undefined,
        registradaEn: new Date(ubicacion.timestamp).toISOString(),
      });
      enviadoHasta = ubicacion.timestamp;
      await SecureStore.setItemAsync(CLAVE_ULTIMO_ENVIO, String(enviadoHasta));
    }
  } catch (error) {
    if (error instanceof ErrorApi && [401, 403].includes(error.status)) {
      await detenerSeguimientoLocal();
      throw error;
    }
  }
}

if (!TaskManager.isTaskDefined(NOMBRE_TAREA_UBICACION)) {
  TaskManager.defineTask(NOMBRE_TAREA_UBICACION, async ({ data, error }) => {
    if (error || !sonDatosDeUbicacion(data)) return;
    await registrarLote(data.locations);
  });
}

async function detenerSeguimientoLocal(): Promise<void> {
  const iniciado = await Location.hasStartedLocationUpdatesAsync(
    NOMBRE_TAREA_UBICACION,
  );
  if (iniciado) {
    await Location.stopLocationUpdatesAsync(NOMBRE_TAREA_UBICACION);
  }
  await Promise.all([
    SecureStore.deleteItemAsync(CLAVE_SEGUIMIENTO_ACTIVO),
    SecureStore.deleteItemAsync(CLAVE_ULTIMO_ENVIO),
  ]);
}

async function iniciarTareaUbicacion(): Promise<void> {
  const iniciada = await Location.hasStartedLocationUpdatesAsync(
    NOMBRE_TAREA_UBICACION,
  );
  if (iniciada) return;

  await Location.startLocationUpdatesAsync(NOMBRE_TAREA_UBICACION, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: INTERVALO_MS,
    deferredUpdatesInterval: INTERVALO_MS,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Comercia: seguimiento activo",
      notificationBody: "Tu ubicación se envía aproximadamente cada minuto.",
      killServiceOnDestroy: false,
    },
  });
}

export async function activarSeguimiento(): Promise<void> {
  const disponible = await TaskManager.isAvailableAsync();
  if (!disponible) {
    throw new Error(
      "El seguimiento en segundo plano requiere una build de desarrollo o producción; no funciona en Expo Go.",
    );
  }

  const sesion = await obtenerSesion();
  if (!sesion) throw new Error("La sesión venció. Iniciá sesión nuevamente.");

  const primerPermiso = await Location.requestForegroundPermissionsAsync();
  if (primerPermiso.status !== "granted") {
    throw new Error(
      "Necesitás permitir la ubicación para activar el seguimiento.",
    );
  }

  const permisoSegundoPlano =
    await Location.requestBackgroundPermissionsAsync();
  if (permisoSegundoPlano.status !== "granted") {
    throw new Error(
      "Necesitás permitir ubicación en segundo plano para continuar. Podés habilitarla desde Ajustes.",
    );
  }

  await actualizarConsentimientoUbicacion(sesion.token, true);
  try {
    await iniciarTareaUbicacion();
    await SecureStore.setItemAsync(CLAVE_SEGUIMIENTO_ACTIVO, "true");
    const actual = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await registrarLote([actual]);
  } catch (error) {
    await actualizarConsentimientoUbicacion(sesion.token, false).catch(
      () => undefined,
    );
    await detenerSeguimientoLocal();
    throw error;
  }
}

export async function detenerSeguimiento(): Promise<void> {
  const sesion = await obtenerSesion();
  await detenerSeguimientoLocal();
  if (sesion) {
    await actualizarConsentimientoUbicacion(sesion.token, false);
  }
}

export async function reanudarSeguimiento(): Promise<boolean> {
  const debeReanudar =
    (await SecureStore.getItemAsync(CLAVE_SEGUIMIENTO_ACTIVO)) === "true";
  if (!debeReanudar) return false;

  const disponible = await TaskManager.isAvailableAsync();
  const permiso = await Location.getBackgroundPermissionsAsync();
  if (!disponible || permiso.status !== "granted") return false;

  try {
    await iniciarTareaUbicacion();
    return true;
  } catch {
    return false;
  }
}

export async function estaSeguimientoActivo(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(NOMBRE_TAREA_UBICACION);
}
