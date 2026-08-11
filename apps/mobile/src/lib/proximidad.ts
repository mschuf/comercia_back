import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SQLite from "expo-sqlite";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import type { SesionMovil } from "./sesion";
import type { VisitaHoy } from "../types/impulsador";

export const TAREA_GEOCERCAS = "comercia.impulsador.geocercas";
const NOMBRE_BASE = "comercia-ubicaciones.db";
const CANAL_PROXIMIDAD = "proximidad";

export interface NotificacionProximidad {
  id: number;
  localId: number;
  localNombre: string;
  clienteNombre: string;
  creadaEn: string;
  leidaEn: string | null;
}

type DatosGeocerca = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (!TaskManager.isTaskDefined(TAREA_GEOCERCAS)) {
  TaskManager.defineTask(TAREA_GEOCERCAS, async ({ data, error }) => {
    try {
      if (error || !data) return;
      const { eventType, region } = data as DatosGeocerca;
      if (eventType !== Location.GeofencingEventType.Enter) return;
      const localId = Number(region.identifier?.replace("local:", ""));
      if (!Number.isInteger(localId)) return;
      const base = await obtenerBase();
      const agenda = await base.getFirstAsync<{
        usuario_id: number;
        local_nombre: string;
        cliente_nombre: string;
      }>(
        `SELECT usuario_id, local_nombre, cliente_nombre
           FROM agenda_geocercas WHERE local_id = $localId LIMIT 1`,
        { $localId: localId },
      );
      if (!agenda) return;
      const ahora = new Date();
      const fecha = ahora.toISOString().slice(0, 10);
      const resultado = await base.runAsync(
        `INSERT OR IGNORE INTO notificaciones_proximidad
          (usuario_id, local_id, local_nombre, cliente_nombre, fecha, creada_en)
         VALUES ($usuarioId, $localId, $localNombre, $clienteNombre, $fecha, $creadaEn)`,
        {
          $usuarioId: agenda.usuario_id,
          $localId: localId,
          $localNombre: agenda.local_nombre,
          $clienteNombre: agenda.cliente_nombre,
          $fecha: fecha,
          $creadaEn: ahora.toISOString(),
        },
      );
      if (resultado.changes === 0) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Estás cerca de ${agenda.local_nombre}`,
          body: "Si ya llegaste, podés marcar tu entrada en Comercia.",
          data: { pantalla: "entrada", localId },
        },
        trigger:
          Platform.OS === "android" ? { channelId: CANAL_PROXIMIDAD } : null,
      });
    } catch {
      // La geocerca nunca debe cerrar el proceso si Android limita la tarea.
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

  const disponible = await TaskManager.isAvailableAsync();
  if (!disponible || agenda.length === 0) return false;
  let primero = await Location.getForegroundPermissionsAsync();
  if (primero.status !== "granted" && solicitarPermisos) {
    primero = await Location.requestForegroundPermissionsAsync();
  }
  if (primero.status !== "granted") return false;
  let segundo = await Location.getBackgroundPermissionsAsync();
  if (segundo.status !== "granted" && solicitarPermisos) {
    segundo = await Location.requestBackgroundPermissionsAsync();
  }
  if (segundo.status !== "granted") return false;
  if (!(await prepararNotificaciones(solicitarPermisos))) return false;

  const unicos = new Map<number, VisitaHoy>();
  agenda.forEach((visita) => unicos.set(visita.local.id, visita));
  await Location.startGeofencingAsync(
    TAREA_GEOCERCAS,
    [...unicos.values()].slice(0, 100).map((visita) => ({
      identifier: `local:${visita.local.id}`,
      latitude: visita.local.latitud,
      longitude: visita.local.longitud,
      radius: Math.max(50, visita.local.radioMetros),
      notifyOnEnter: true,
      notifyOnExit: false,
    })),
  );
  return true;
}

export async function obtenerAgendaGuardada(
  usuarioId: number,
): Promise<VisitaHoy[]> {
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

export async function listarNotificacionesProximidad(
  usuarioId: number,
): Promise<NotificacionProximidad[]> {
  const base = await obtenerBase();
  const filas = await base.getAllAsync<{
    id: number;
    local_id: number;
    local_nombre: string;
    cliente_nombre: string;
    creada_en: string;
    leida_en: string | null;
  }>(
    `SELECT id, local_id, local_nombre, cliente_nombre, creada_en, leida_en
       FROM notificaciones_proximidad
      WHERE usuario_id = $usuarioId
      ORDER BY creada_en DESC
      LIMIT 50`,
    { $usuarioId: usuarioId },
  );
  return filas.map((fila) => ({
    id: fila.id,
    localId: fila.local_id,
    localNombre: fila.local_nombre,
    clienteNombre: fila.cliente_nombre,
    creadaEn: fila.creada_en,
    leidaEn: fila.leida_en,
  }));
}

export async function marcarNotificacionesLeidas(
  usuarioId: number,
): Promise<void> {
  const base = await obtenerBase();
  await base.runAsync(
    `UPDATE notificaciones_proximidad SET leida_en = $leidaEn
      WHERE usuario_id = $usuarioId AND leida_en IS NULL`,
    { $usuarioId: usuarioId, $leidaEn: new Date().toISOString() },
  );
}

export async function detenerGeocercas(): Promise<void> {
  if (await Location.hasStartedGeofencingAsync(TAREA_GEOCERCAS)) {
    await Location.stopGeofencingAsync(TAREA_GEOCERCAS);
  }
}
