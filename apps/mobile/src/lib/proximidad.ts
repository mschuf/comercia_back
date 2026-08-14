import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SQLite from "expo-sqlite";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { VisitaHoy } from "../types/impulsador";
import type { SesionMovil } from "./sesion";

export const TAREA_GEOCERCAS = "comercia.impulsador.geocercas";
export const TAREA_PROXIMIDAD = "comercia.impulsador.proximidad";

const NOMBRE_BASE = "comercia-ubicaciones.db";
const CANAL_PROXIMIDAD = "proximidad";
const INTERVALO_PROXIMIDAD_MS = 120_000;
const ZONA_HORARIA = "America/Asuncion";

type AgendaProximidad = {
  usuarioId: number;
  localId: number;
  localNombre: string;
  clienteNombre: string;
  latitud: number;
  longitud: number;
  radioMetros: number;
};

type DatosGeocerca = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

type DatosUbicacion = {
  locations?: Location.LocationObject[];
};

let promesaBase: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

async function obtenerBase() {
  if (!promesaBase) {
    promesaBase = SQLite.openDatabaseAsync(NOMBRE_BASE).then(async (base) => {
      await base.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS agenda_geocercas (
          usuario_id INTEGER NOT NULL,
          local_id INTEGER NOT NULL,
          local_nombre TEXT NOT NULL,
          cliente_nombre TEXT NOT NULL,
          latitud REAL NOT NULL,
          longitud REAL NOT NULL,
          radio_metros REAL NOT NULL,
          programada_en TEXT NOT NULL,
          PRIMARY KEY(usuario_id, local_id)
        );
        CREATE TABLE IF NOT EXISTS agenda_impulsador_cache (
          usuario_id INTEGER PRIMARY KEY,
          datos_json TEXT NOT NULL,
          actualizada_en TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS notificaciones_proximidad (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          local_id INTEGER NOT NULL,
          local_nombre TEXT NOT NULL,
          cliente_nombre TEXT NOT NULL,
          fecha TEXT NOT NULL,
          creada_en TEXT NOT NULL,
          leida_en TEXT,
          UNIQUE(usuario_id, local_id, fecha)
        );
        CREATE INDEX IF NOT EXISTS idx_notificaciones_proximidad_usuario
          ON notificaciones_proximidad(usuario_id, creada_en DESC);
      `);
      return base;
    });
  }
  return promesaBase;
}

function fechaLocalActual(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}

function distanciaMetros(
  latitud1: number,
  longitud1: number,
  latitud2: number,
  longitud2: number,
) {
  const aRadianes = (grados: number) => (grados * Math.PI) / 180;
  const deltaLatitud = aRadianes(latitud2 - latitud1);
  const deltaLongitud = aRadianes(longitud2 - longitud1);
  const a =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(aRadianes(latitud1)) *
      Math.cos(aRadianes(latitud2)) *
      Math.sin(deltaLongitud / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function notificarUnaVezPorDia(local: AgendaProximidad) {
  const base = await obtenerBase();
  const ahora = new Date();
  const fechaHoy = fechaLocalActual(ahora);
  await base.runAsync(
    `DELETE FROM notificaciones_proximidad WHERE fecha < $fechaLimite`,
    { $fechaLimite: fechaLocalActual(new Date(ahora.getTime() - 31 * 86_400_000)) },
  );
  const resultado = await base.runAsync(
    `INSERT OR IGNORE INTO notificaciones_proximidad
      (usuario_id, local_id, local_nombre, cliente_nombre, fecha, creada_en)
     VALUES ($usuarioId, $localId, $localNombre, $clienteNombre, $fecha, $creadaEn)`,
    {
      $usuarioId: local.usuarioId,
      $localId: local.localId,
      $localNombre: local.localNombre,
      $clienteNombre: local.clienteNombre,
      $fecha: fechaHoy,
      $creadaEn: ahora.toISOString(),
    },
  );
  if (resultado.changes === 0) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Estás cerca de ${local.localNombre}`,
      body: "Si ya llegaste, podés marcar tu entrada en Comercia.",
      data: { pantalla: "entrada", localId: local.localId },
    },
    trigger: Platform.OS === "android" ? { channelId: CANAL_PROXIMIDAD } : null,
  });
}

async function revisarUbicacion(
  latitud: number,
  longitud: number,
  agenda?: AgendaProximidad[],
) {
  const base = await obtenerBase();
  const locales =
    agenda ??
    (await base.getAllAsync<{
      usuario_id: number;
      local_id: number;
      local_nombre: string;
      cliente_nombre: string;
      latitud: number;
      longitud: number;
      radio_metros: number;
    }>(
      `SELECT usuario_id, local_id, local_nombre, cliente_nombre, latitud,
              longitud, radio_metros
         FROM agenda_geocercas`,
    )).map((local) => ({
      usuarioId: local.usuario_id,
      localId: local.local_id,
      localNombre: local.local_nombre,
      clienteNombre: local.cliente_nombre,
      latitud: local.latitud,
      longitud: local.longitud,
      radioMetros: local.radio_metros,
    }));

  for (const local of locales) {
    if (
      distanciaMetros(latitud, longitud, local.latitud, local.longitud) <=
      Math.max(50, local.radioMetros)
    ) {
      await notificarUnaVezPorDia(local);
    }
  }
}

if (!TaskManager.isTaskDefined(TAREA_GEOCERCAS)) {
  TaskManager.defineTask(TAREA_GEOCERCAS, async ({ data, error }) => {
    try {
      if (error || !data) return;
      const { eventType, region } = data as DatosGeocerca;
      if (eventType !== Location.GeofencingEventType.Enter) return;
      const coincidencia = /^usuario:(\d+):local:(\d+)$/.exec(
        region.identifier ?? "",
      );
      if (!coincidencia) return;

      const usuarioId = Number(coincidencia[1]);
      const localId = Number(coincidencia[2]);
      const base = await obtenerBase();
      const local = await base.getFirstAsync<{
        usuario_id: number;
        local_id: number;
        local_nombre: string;
        cliente_nombre: string;
        latitud: number;
        longitud: number;
        radio_metros: number;
      }>(
        `SELECT usuario_id, local_id, local_nombre, cliente_nombre, latitud,
                longitud, radio_metros
           FROM agenda_geocercas
          WHERE usuario_id = $usuarioId AND local_id = $localId
          LIMIT 1`,
        { $usuarioId: usuarioId, $localId: localId },
      );
      if (!local) return;
      await notificarUnaVezPorDia({
        usuarioId: local.usuario_id,
        localId: local.local_id,
        localNombre: local.local_nombre,
        clienteNombre: local.cliente_nombre,
        latitud: local.latitud,
        longitud: local.longitud,
        radioMetros: local.radio_metros,
      });
    } catch {
      // Android puede limitar tareas en segundo plano; nunca cerramos la app.
    }
  });
}

if (!TaskManager.isTaskDefined(TAREA_PROXIMIDAD)) {
  TaskManager.defineTask(TAREA_PROXIMIDAD, async ({ data, error }) => {
    try {
      if (error || !data) return;
      const ubicaciones = (data as DatosUbicacion).locations ?? [];
      const ubicacion = ubicaciones[ubicaciones.length - 1];
      if (!ubicacion) return;
      await revisarUbicacion(
        ubicacion.coords.latitude,
        ubicacion.coords.longitude,
      );
    } catch {
      // El monitoreo sólo genera avisos locales y debe fallar de forma segura.
    }
  });
}

async function prepararNotificaciones(solicitar: boolean): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CANAL_PROXIMIDAD, {
      name: "Llegadas a locales",
      description: "Avisos cuando estás cerca de un local programado",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180],
    });
  }
  let permiso = await Notifications.getPermissionsAsync();
  if (!permiso.granted && solicitar) {
    permiso = await Notifications.requestPermissionsAsync();
  }
  return permiso.granted;
}

export async function tienePermisosProximidad(): Promise<boolean> {
  const [permisoPrimerPlano, permisoSegundoPlano, permisoNotificaciones] =
    await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
      Notifications.getPermissionsAsync(),
    ]);
  return (
    permisoPrimerPlano.granted &&
    permisoSegundoPlano.granted &&
    permisoNotificaciones.granted
  );
}

export async function sincronizarGeocercas(
  sesion: SesionMovil,
  agenda: VisitaHoy[],
  solicitarPermisos: boolean,
): Promise<boolean> {
  const base = await obtenerBase();
  await base.withExclusiveTransactionAsync(async (transaccion) => {
    await transaccion.runAsync(
      `DELETE FROM agenda_geocercas WHERE usuario_id = $usuarioId`,
      { $usuarioId: sesion.usuario.id },
    );
    const locales = new Map<number, VisitaHoy>();
    agenda.forEach((visita) => locales.set(visita.local.id, visita));
    for (const visita of locales.values()) {
      await transaccion.runAsync(
        `INSERT INTO agenda_geocercas
          (usuario_id, local_id, local_nombre, cliente_nombre, latitud,
           longitud, radio_metros, programada_en)
         VALUES ($usuarioId, $localId, $localNombre, $clienteNombre,
           $latitud, $longitud, $radioMetros, $programadaEn)`,
        {
          $usuarioId: sesion.usuario.id,
          $localId: visita.local.id,
          $localNombre: visita.local.nombre,
          $clienteNombre: visita.local.cliente.nombre,
          $latitud: visita.local.latitud,
          $longitud: visita.local.longitud,
          $radioMetros: Math.max(50, visita.local.radioMetros),
          $programadaEn: visita.programadaEn,
        },
      );
    }
    await transaccion.runAsync(
      `INSERT INTO agenda_impulsador_cache
        (usuario_id, datos_json, actualizada_en)
       VALUES ($usuarioId, $datos, $actualizadaEn)
       ON CONFLICT(usuario_id) DO UPDATE SET
         datos_json = excluded.datos_json,
         actualizada_en = excluded.actualizada_en`,
      {
        $usuarioId: sesion.usuario.id,
        $datos: JSON.stringify(agenda),
        $actualizadaEn: new Date().toISOString(),
      },
    );
  });

  if (!(await TaskManager.isAvailableAsync()) || agenda.length === 0) {
    await detenerGeocercas();
    return false;
  }

  let permisoPrimerPlano = await Location.getForegroundPermissionsAsync();
  if (permisoPrimerPlano.status !== "granted" && solicitarPermisos) {
    permisoPrimerPlano = await Location.requestForegroundPermissionsAsync();
  }
  if (permisoPrimerPlano.status !== "granted") return false;

  let permisoSegundoPlano = await Location.getBackgroundPermissionsAsync();
  if (permisoSegundoPlano.status !== "granted" && solicitarPermisos) {
    permisoSegundoPlano = await Location.requestBackgroundPermissionsAsync();
  }
  if (permisoSegundoPlano.status !== "granted") return false;
  if (!(await prepararNotificaciones(solicitarPermisos))) return false;

  const locales = [...new Map(agenda.map((visita) => [visita.local.id, visita])).values()].slice(0, 100);
  await Location.startGeofencingAsync(
    TAREA_GEOCERCAS,
    locales.map((visita) => ({
      identifier: `usuario:${sesion.usuario.id}:local:${visita.local.id}`,
      latitude: visita.local.latitud,
      longitude: visita.local.longitud,
      radius: Math.max(50, visita.local.radioMetros),
      notifyOnEnter: true,
      notifyOnExit: false,
    })),
  );

  if (await Location.hasStartedLocationUpdatesAsync(TAREA_PROXIMIDAD)) {
    await Location.stopLocationUpdatesAsync(TAREA_PROXIMIDAD);
  }
  await Location.startLocationUpdatesAsync(TAREA_PROXIMIDAD, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: INTERVALO_PROXIMIDAD_MS,
    distanceInterval: 50,
    deferredUpdatesInterval: INTERVALO_PROXIMIDAD_MS,
    deferredUpdatesDistance: 50,
    ...(Platform.OS === "android"
      ? {
          foregroundService: {
            notificationTitle: "Cercanía automática activa",
            notificationBody: "Comercia revisa tus locales programados.",
            notificationColor: "#18766A",
            killServiceOnDestroy: true,
          },
        }
      : {}),
  });
  return true;
}

export async function obtenerAgendaGuardada(usuarioId: number): Promise<VisitaHoy[]> {
  const base = await obtenerBase();
  const fila = await base.getFirstAsync<{ datos_json: string }>(
    `SELECT datos_json FROM agenda_impulsador_cache
      WHERE usuario_id = $usuarioId`,
    { $usuarioId: usuarioId },
  );
  if (!fila) return [];
  try {
    const agenda = JSON.parse(fila.datos_json) as VisitaHoy[];
    return Array.isArray(agenda) ? agenda : [];
  } catch {
    return [];
  }
}

export async function detenerGeocercas(): Promise<void> {
  if (await Location.hasStartedGeofencingAsync(TAREA_GEOCERCAS)) {
    await Location.stopGeofencingAsync(TAREA_GEOCERCAS);
  }
  if (await Location.hasStartedLocationUpdatesAsync(TAREA_PROXIMIDAD)) {
    await Location.stopLocationUpdatesAsync(TAREA_PROXIMIDAD);
  }
}
