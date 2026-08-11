import * as SQLite from "expo-sqlite";
import { finalizarVisita, finalizarVisitaMovil, iniciarVisita } from "./api";
import { obtenerSesion } from "./sesion";
import type { CoordenadasMarcacion, Visita } from "../types/impulsador";

const NOMBRE_BASE = "comercia-ubicaciones.db";
const LIMITE_LOTE = 100;

type TipoMarcacion = "ENTRADA" | "SALIDA";

interface FilaMarcacion {
  id: number;
  usuario_id: number;
  clave: string;
  tipo: TipoMarcacion;
  entrada_clave: string | null;
  visita_id: number | null;
  local_id: number;
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  registrada_en: string;
}

export interface ResultadoSincronizacionMarcaciones {
  enviadas: number;
  pendientes: number;
  ultimaVisita?: Visita;
  ultimoError?: string;
}

let promesaBase: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;
let sincronizacion: Promise<ResultadoSincronizacionMarcaciones> | null = null;

async function obtenerBase() {
  if (!promesaBase) {
    promesaBase = SQLite.openDatabaseAsync(NOMBRE_BASE).then(async (base) => {
      await base.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS marcaciones_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          clave TEXT NOT NULL,
          tipo TEXT NOT NULL CHECK(tipo IN ('ENTRADA', 'SALIDA')),
          entrada_clave TEXT,
          visita_id INTEGER,
          local_id INTEGER NOT NULL,
          latitud REAL NOT NULL,
          longitud REAL NOT NULL,
          precision_metros REAL,
          registrada_en TEXT NOT NULL,
          creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          intentos INTEGER NOT NULL DEFAULT 0,
          ultimo_error TEXT,
          UNIQUE(usuario_id, clave)
        );
        CREATE INDEX IF NOT EXISTS idx_marcaciones_pendientes_usuario
          ON marcaciones_pendientes(usuario_id, id);
      `);
      return base;
    });
  }
  return promesaBase;
}

export function nuevaClaveMarcacion(
  usuarioId: number,
  tipo: TipoMarcacion,
): string {
  const aleatorio = Math.random().toString(36).slice(2, 12);
  return `comercia:${usuarioId}:${tipo.toLowerCase()}:${Date.now()}:${aleatorio}`;
}

async function guardar(
  usuarioId: number,
  tipo: TipoMarcacion,
  localId: number,
  ubicacion: CoordenadasMarcacion,
  opciones: { entradaClave?: string; visitaId?: number } = {},
): Promise<void> {
  const base = await obtenerBase();
  await base.runAsync(
    `INSERT OR IGNORE INTO marcaciones_pendientes
      (usuario_id, clave, tipo, entrada_clave, visita_id, local_id,
       latitud, longitud, precision_metros, registrada_en)
     VALUES ($usuarioId, $clave, $tipo, $entradaClave, $visitaId, $localId,
       $latitud, $longitud, $precisionMetros, $registradaEn)`,
    {
      $usuarioId: usuarioId,
      $clave: ubicacion.claveMovil,
      $tipo: tipo,
      $entradaClave: opciones.entradaClave ?? null,
      $visitaId: opciones.visitaId ?? null,
      $localId: localId,
      $latitud: ubicacion.latitud,
      $longitud: ubicacion.longitud,
      $precisionMetros: ubicacion.precisionMetros ?? null,
      $registradaEn: ubicacion.registradaEn,
    },
  );
}

export function guardarEntradaPendiente(
  usuarioId: number,
  localId: number,
  ubicacion: CoordenadasMarcacion,
): Promise<void> {
  return guardar(usuarioId, "ENTRADA", localId, ubicacion);
}

export function guardarSalidaPendiente(
  usuarioId: number,
  localId: number,
  ubicacion: CoordenadasMarcacion,
  entradaClave: string,
  visitaId?: number,
): Promise<void> {
  return guardar(usuarioId, "SALIDA", localId, ubicacion, {
    entradaClave,
    visitaId,
  });
}

export async function cantidadMarcacionesPendientes(): Promise<number> {
  const sesion = await obtenerSesion();
  if (!sesion) return 0;
  const base = await obtenerBase();
  const fila = await base.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM marcaciones_pendientes
      WHERE usuario_id = $usuarioId`,
    { $usuarioId: sesion.usuario.id },
  );
  return fila?.total ?? 0;
}

async function ejecutar(): Promise<ResultadoSincronizacionMarcaciones> {
  const sesion = await obtenerSesion();
  if (!sesion) return { enviadas: 0, pendientes: 0 };
  const base = await obtenerBase();
  const filas = await base.getAllAsync<FilaMarcacion>(
    `SELECT id, usuario_id, clave, tipo, entrada_clave, visita_id, local_id,
            latitud, longitud, precision_metros, registrada_en
       FROM marcaciones_pendientes
      WHERE usuario_id = $usuarioId
      ORDER BY id ASC
      LIMIT $limite`,
    { $usuarioId: sesion.usuario.id, $limite: LIMITE_LOTE },
  );
  let enviadas = 0;
  let ultimaVisita: Visita | undefined;
  let ultimoError: string | undefined;

  for (const fila of filas) {
    const ubicacion: CoordenadasMarcacion = {
      latitud: fila.latitud,
      longitud: fila.longitud,
      precisionMetros: fila.precision_metros ?? undefined,
      registradaEn: fila.registrada_en,
      claveMovil: fila.clave,
    };
    try {
      ultimaVisita =
        fila.tipo === "ENTRADA"
          ? await iniciarVisita(sesion.token, fila.local_id, ubicacion)
          : fila.visita_id
            ? await finalizarVisita(sesion.token, fila.visita_id, ubicacion)
            : await finalizarVisitaMovil(
                sesion.token,
                fila.entrada_clave ?? "",
                ubicacion,
              );
      await base.runAsync(
        `DELETE FROM marcaciones_pendientes
          WHERE id = $id AND usuario_id = $usuarioId`,
        { $id: fila.id, $usuarioId: sesion.usuario.id },
      );
      enviadas += 1;
    } catch (error) {
      ultimoError =
        error instanceof Error ? error.message : "No se pudo sincronizar";
      await base.runAsync(
        `UPDATE marcaciones_pendientes
            SET intentos = intentos + 1, ultimo_error = $error
          WHERE id = $id AND usuario_id = $usuarioId`,
        {
          $id: fila.id,
          $usuarioId: sesion.usuario.id,
          $error: ultimoError.slice(0, 300),
        },
      );
      break;
    }
  }

  return {
    enviadas,
    pendientes: await cantidadMarcacionesPendientes(),
    ultimaVisita,
    ultimoError,
  };
}

export function sincronizarMarcacionesPendientes(): Promise<ResultadoSincronizacionMarcaciones> {
  if (sincronizacion) return sincronizacion;
  sincronizacion = ejecutar().finally(() => {
    sincronizacion = null;
  });
  return sincronizacion;
}
