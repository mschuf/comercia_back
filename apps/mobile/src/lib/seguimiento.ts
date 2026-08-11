import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import {
  actualizarConsentimientoUbicacion,
  ErrorApi,
  registrarUbicacion,
} from "./api";
import {
  contarUbicacionesPendientes,
  eliminarUbicacionPendiente,
  guardarUbicacionPendiente,
  listarUbicacionesPendientes,
  marcarIntentoFallido,
} from "./cola-ubicaciones";
import { obtenerSesion } from "./sesion";

export const NOMBRE_TAREA_UBICACION = "comercia.seguimiento.ubicacion";
const CLAVE_SEGUIMIENTO_ACTIVO = "comercia.mobile.seguimiento.activo";
const CLAVE_CONSENTIMIENTO_CONFIRMADO =
  "comercia.mobile.consentimiento-servidor-activo";
const CLAVE_ACTIVACION_PENDIENTE =
  "comercia.mobile.consentimiento-activacion-pendiente";
const CLAVE_REVOCACION_PENDIENTE =
  "comercia.mobile.consentimiento-revocacion-pendiente";
// Se conserva la clave existente para no perder el intervalo al actualizar la APK.
const CLAVE_ULTIMA_CAPTURA = "comercia.mobile.seguimiento.ultimo-envio";
const INTERVALO_MS = 3 * 60_000;
const TAMANO_LOTE = 100;
const MAX_UBICACIONES_POR_SINCRONIZACION = 500;

type DatosTareaUbicacion = { locations: Location.LocationObject[] };

export type ResultadoSincronizacion = {
  enviadas: number;
  pendientes: number;
};

let sincronizacionEnCurso: Promise<ResultadoSincronizacion> | null = null;

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

  const ultimaCaptura = Number(
    (await SecureStore.getItemAsync(CLAVE_ULTIMA_CAPTURA)) ?? "0",
  );
  let guardadoHasta = ultimaCaptura;

  for (const ubicacion of [...ubicaciones].sort(
    (primera, segunda) => primera.timestamp - segunda.timestamp,
  )) {
    if (ubicacion.timestamp - guardadoHasta < INTERVALO_MS) continue;
    if (
      !Number.isFinite(ubicacion.coords.latitude) ||
      !Number.isFinite(ubicacion.coords.longitude)
    ) {
      continue;
    }

    // Primero se persiste en el teléfono. La red nunca forma parte de esta
    // transacción: solo se borra luego de la confirmación del servidor.
    await guardarUbicacionPendiente({
      usuarioId: sesion.usuario.id,
      latitud: ubicacion.coords.latitude,
      longitud: ubicacion.coords.longitude,
      precisionMetros: ubicacion.coords.accuracy ?? undefined,
      registradaEn: new Date(ubicacion.timestamp).toISOString(),
    });
    guardadoHasta = ubicacion.timestamp;
    await SecureStore.setItemAsync(
      CLAVE_ULTIMA_CAPTURA,
      String(guardadoHasta),
    );
  }

  await sincronizarUbicacionesPendientes();
}

async function ejecutarSincronizacion(): Promise<ResultadoSincronizacion> {
  const sesion = await obtenerSesion();
  if (!sesion) return { enviadas: 0, pendientes: 0 };

  const activacionPendiente =
    (await SecureStore.getItemAsync(CLAVE_ACTIVACION_PENDIENTE)) === "true";
  if (activacionPendiente) {
    try {
      await actualizarConsentimientoUbicacion(sesion.token, true);
      await Promise.all([
        SecureStore.setItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO, "true"),
        SecureStore.deleteItemAsync(CLAVE_ACTIVACION_PENDIENTE),
      ]);
    } catch (error) {
      if (error instanceof ErrorApi && [401, 403].includes(error.status)) {
        await detenerSeguimientoLocal();
        throw error;
      }
      return {
        enviadas: 0,
        pendientes: await contarUbicacionesPendientes(sesion.usuario.id),
      };
    }
  }

  let enviadas = 0;
  let continuar = true;

  while (continuar && enviadas < MAX_UBICACIONES_POR_SINCRONIZACION) {
    const lote = await listarUbicacionesPendientes(sesion.usuario.id);
    if (lote.length === 0) break;

    for (const ubicacion of lote) {
      try {
        await registrarUbicacion(sesion.token, {
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud,
          precisionMetros: ubicacion.precisionMetros,
          registradaEn: ubicacion.registradaEn,
        });
        await eliminarUbicacionPendiente(ubicacion.id, sesion.usuario.id);
        enviadas += 1;
      } catch (error) {
        await marcarIntentoFallido(
          ubicacion.id,
          sesion.usuario.id,
          error instanceof Error ? error.message : "Error de sincronización",
        ).catch(() => undefined);

        if (error instanceof ErrorApi && [401, 403].includes(error.status)) {
          if (error.status === 403) {
            await SecureStore.deleteItemAsync(
              CLAVE_CONSENTIMIENTO_CONFIRMADO,
            );
          }
          await detenerSeguimientoLocal();
          throw error;
        }

        // Se conserva el registro para el próximo cambio de red o ciclo GPS.
        continuar = false;
        break;
      }
    }

    if (lote.length < TAMANO_LOTE) break;
  }

  return {
    enviadas,
    pendientes: await contarUbicacionesPendientes(sesion.usuario.id),
  };
}

export async function sincronizarUbicacionesPendientes(): Promise<ResultadoSincronizacion> {
  if (sincronizacionEnCurso) return sincronizacionEnCurso;

  sincronizacionEnCurso = ejecutarSincronizacion().finally(() => {
    sincronizacionEnCurso = null;
  });
  return sincronizacionEnCurso;
}

export async function cantidadUbicacionesPendientes(): Promise<number> {
  const sesion = await obtenerSesion();
  if (!sesion) return 0;
  return contarUbicacionesPendientes(sesion.usuario.id);
}

export async function sincronizarRevocacionPendiente(): Promise<void> {
  const pendiente =
    (await SecureStore.getItemAsync(CLAVE_REVOCACION_PENDIENTE)) === "true";
  if (!pendiente) return;

  const sesion = await obtenerSesion();
  if (!sesion) return;
  if ((await contarUbicacionesPendientes(sesion.usuario.id)) > 0) return;

  await actualizarConsentimientoUbicacion(sesion.token, false);
  await Promise.all([
    SecureStore.deleteItemAsync(CLAVE_ACTIVACION_PENDIENTE),
    SecureStore.deleteItemAsync(CLAVE_REVOCACION_PENDIENTE),
    SecureStore.deleteItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO),
  ]);
}

if (!TaskManager.isTaskDefined(NOMBRE_TAREA_UBICACION)) {
  TaskManager.defineTask(NOMBRE_TAREA_UBICACION, async ({ data, error }) => {
    try {
      if (error || !sonDatosDeUbicacion(data)) return;
      await registrarLote(data.locations);
    } catch {
      // Android podría finalizar el proceso ante una excepción no controlada.
      // Los fallos transitorios conservan la cola y no paran el seguimiento.
    }
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
    SecureStore.deleteItemAsync(CLAVE_ULTIMA_CAPTURA),
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
      notificationBody:
        "Tu ubicación se guarda aproximadamente cada 3 minutos.",
      killServiceOnDestroy: false,
    },
  });
}

export async function activarSeguimiento(): Promise<void> {
  const disponible = await TaskManager.isAvailableAsync();
  if (!disponible) {
    throw new Error(
      "El seguimiento en segundo plano requiere una APK instalada; no funciona en Expo Go.",
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
      "Necesitás permitir ubicación en segundo plano. Podés habilitarla desde Ajustes.",
    );
  }

  const consentimientoConfirmado =
    (await SecureStore.getItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO)) ===
    "true";
  let consentimientoOtorgadoAhora = false;
  let activacionPendienteAhora = false;

  // Solo la primera activación (o una posterior a una revocación confirmada)
  // necesita red. Si una revocación quedó pendiente por falta de señal, volver
  // a activar cancela esa intención y puede continuar con el permiso remoto
  // que ya estaba confirmado.
  if (!consentimientoConfirmado) {
    try {
      await actualizarConsentimientoUbicacion(sesion.token, true);
      consentimientoOtorgadoAhora = true;
      await Promise.all([
        SecureStore.setItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO, "true"),
        SecureStore.deleteItemAsync(CLAVE_ACTIVACION_PENDIENTE),
      ]);
    } catch (error) {
      if (
        error instanceof ErrorApi &&
        error.status < 500 &&
        ![408, 429].includes(error.status)
      ) {
        throw error;
      }
      activacionPendienteAhora = true;
      await SecureStore.setItemAsync(CLAVE_ACTIVACION_PENDIENTE, "true");
    }
  }
  await SecureStore.deleteItemAsync(CLAVE_REVOCACION_PENDIENTE);

  try {
    await iniciarTareaUbicacion();
    await SecureStore.setItemAsync(CLAVE_SEGUIMIENTO_ACTIVO, "true");
    const actual = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await registrarLote([actual]);
  } catch (error) {
    if (consentimientoOtorgadoAhora) {
      const revocada = await actualizarConsentimientoUbicacion(
        sesion.token,
        false,
      )
        .then(() => true)
        .catch(() => false);
      if (revocada) {
        await SecureStore.deleteItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO);
      } else {
        await SecureStore.setItemAsync(CLAVE_REVOCACION_PENDIENTE, "true");
      }
    } else if (activacionPendienteAhora) {
      // La petición pudo haber llegado aunque la respuesta se perdiera. Al
      // recuperar red se confirma el alta y luego se revoca de forma segura.
      await SecureStore.setItemAsync(CLAVE_REVOCACION_PENDIENTE, "true");
    }
    await detenerSeguimientoLocal();
    throw error;
  }
}

export async function detenerSeguimiento(): Promise<void> {
  const sesion = await obtenerSesion();
  await detenerSeguimientoLocal();
  if (!sesion) return;

  await SecureStore.setItemAsync(CLAVE_REVOCACION_PENDIENTE, "true");

  // Detener siempre tiene éxito en el teléfono. Si no hay red, las posiciones
  // ya capturadas se enviarán primero y la revocación se completará después.
  try {
    const resultado = await sincronizarUbicacionesPendientes();
    if (resultado.pendientes > 0) {
      return;
    }
    await actualizarConsentimientoUbicacion(sesion.token, false);
    await Promise.all([
      SecureStore.deleteItemAsync(CLAVE_REVOCACION_PENDIENTE),
      SecureStore.deleteItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO),
    ]);
  } catch {
    // La intención ya quedó persistida antes de intentar usar la red.
  }
}

export async function reanudarSeguimiento(): Promise<boolean> {
  const debeReanudar =
    (await SecureStore.getItemAsync(CLAVE_SEGUIMIENTO_ACTIVO)) === "true";
  if (!debeReanudar) return false;

  // Compatibilidad con instalaciones anteriores: esa clave solo se escribía
  // después de que el servidor confirmaba el consentimiento.
  if (!(await SecureStore.getItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO))) {
    await SecureStore.setItemAsync(CLAVE_CONSENTIMIENTO_CONFIRMADO, "true");
  }

  const disponible = await TaskManager.isAvailableAsync();
  const permiso = await Location.getBackgroundPermissionsAsync();
  if (!disponible || permiso.status !== "granted") return false;

  try {
    await iniciarTareaUbicacion();
    await sincronizarUbicacionesPendientes();
    return true;
  } catch {
    // La cola puede seguir sin red; que falle el envío no desactiva el GPS.
    return Location.hasStartedLocationUpdatesAsync(NOMBRE_TAREA_UBICACION);
  }
}

export async function estaSeguimientoActivo(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(NOMBRE_TAREA_UBICACION);
}
