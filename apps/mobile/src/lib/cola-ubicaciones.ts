import * as SQLite from "expo-sqlite";

const NOMBRE_BASE = "comercia-ubicaciones.db";
const LIMITE_LOTE = 100;

export type NuevaUbicacionPendiente = {
  usuarioId: number;
  latitud: number;
  longitud: number;
  precisionMetros?: number;
  registradaEn: string;
};

export type UbicacionPendiente = NuevaUbicacionPendiente & {
  id: number;
  intentos: number;
};

type FilaUbicacion = {
  id: number;
  usuario_id: number;
  latitud: number;
  longitud: number;
  precision_metros: number | null;
  registrada_en: string;
  intentos: number;
};

let promesaBase: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

async function obtenerBase() {
  if (!promesaBase) {
    promesaBase = SQLite.openDatabaseAsync(NOMBRE_BASE).then(async (base) => {
      await base.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS ubicaciones_pendientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          latitud REAL NOT NULL,
          longitud REAL NOT NULL,
          precision_metros REAL,
          registrada_en TEXT NOT NULL,
          creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          intentos INTEGER NOT NULL DEFAULT 0,
          ultimo_error TEXT,
          UNIQUE(usuario_id, registrada_en)
        );
        CREATE INDEX IF NOT EXISTS idx_ubicaciones_pendientes_usuario
          ON ubicaciones_pendientes(usuario_id, id);
      `);
      return base;
    });
  }
  return promesaBase;
}

export async function guardarUbicacionPendiente(
  ubicacion: NuevaUbicacionPendiente,
): Promise<void> {
  const base = await obtenerBase();
  await base.runAsync(
    `INSERT OR IGNORE INTO ubicaciones_pendientes
      (usuario_id, latitud, longitud, precision_metros, registrada_en)
     VALUES ($usuarioId, $latitud, $longitud, $precisionMetros, $registradaEn)`,
    {
      $usuarioId: ubicacion.usuarioId,
      $latitud: ubicacion.latitud,
      $longitud: ubicacion.longitud,
      $precisionMetros: ubicacion.precisionMetros ?? null,
      $registradaEn: ubicacion.registradaEn,
    },
  );
}

export async function listarUbicacionesPendientes(
  usuarioId: number,
): Promise<UbicacionPendiente[]> {
  const base = await obtenerBase();
  const filas = await base.getAllAsync<FilaUbicacion>(
    `SELECT id, usuario_id, latitud, longitud, precision_metros,
            registrada_en, intentos
       FROM ubicaciones_pendientes
      WHERE usuario_id = $usuarioId
      ORDER BY id ASC
      LIMIT $limite`,
    { $usuarioId: usuarioId, $limite: LIMITE_LOTE },
  );
  return filas.map((fila) => ({
    id: fila.id,
    usuarioId: fila.usuario_id,
    latitud: fila.latitud,
    longitud: fila.longitud,
    precisionMetros: fila.precision_metros ?? undefined,
    registradaEn: fila.registrada_en,
    intentos: fila.intentos,
  }));
}

export async function eliminarUbicacionPendiente(
  id: number,
  usuarioId: number,
): Promise<void> {
  const base = await obtenerBase();
  await base.runAsync(
    `DELETE FROM ubicaciones_pendientes
      WHERE id = $id AND usuario_id = $usuarioId`,
    { $id: id, $usuarioId: usuarioId },
  );
}

export async function marcarIntentoFallido(
  id: number,
  usuarioId: number,
  error: string,
): Promise<void> {
  const base = await obtenerBase();
  await base.runAsync(
    `UPDATE ubicaciones_pendientes
        SET intentos = intentos + 1, ultimo_error = $error
      WHERE id = $id AND usuario_id = $usuarioId`,
    { $id: id, $usuarioId: usuarioId, $error: error.slice(0, 300) },
  );
}

export async function contarUbicacionesPendientes(
  usuarioId: number,
): Promise<number> {
  const base = await obtenerBase();
  const fila = await base.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM ubicaciones_pendientes
      WHERE usuario_id = $usuarioId`,
    { $usuarioId: usuarioId },
  );
  return fila?.total ?? 0;
}
