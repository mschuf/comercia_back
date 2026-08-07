import { obtenerApiUrl } from "../config";
import type { SesionMovil } from "./sesion";

export class ErrorApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function mensajeError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as {
      message?: string | string[];
    };
    if (Array.isArray(data.message)) return data.message.join(". ");
    if (data.message) return data.message;
  } catch {
    // La respuesta puede no contener JSON.
  }
  return "No se pudo completar la operación.";
}

async function solicitar<T>(
  ruta: string,
  opciones: RequestInit = {},
  token?: string,
): Promise<T> {
  const response = await fetch(`${obtenerApiUrl()}${ruta}`, {
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  if (!response.ok) {
    throw new ErrorApi(await mensajeError(response), response.status);
  }
  return (await response.json()) as T;
}

export function iniciarSesionMovil(
  identificador: string,
  password: string,
): Promise<SesionMovil> {
  return solicitar("/auth/mobile/login", {
    method: "POST",
    body: JSON.stringify({ identificador, password }),
  });
}

export function iniciarSesionMovilConSim(
  telefonos: string[],
): Promise<SesionMovil> {
  return solicitar("/auth/mobile/sim-login", {
    method: "POST",
    body: JSON.stringify({ telefonos }),
  });
}

export function actualizarConsentimientoUbicacion(
  token: string,
  aceptado: boolean,
): Promise<{ activo: boolean }> {
  return solicitar(
    "/ubicaciones/consentimiento",
    {
      method: "POST",
      body: JSON.stringify({ aceptado, versionPolitica: "1.0" }),
    },
    token,
  );
}

export function registrarUbicacion(
  token: string,
  ubicacion: {
    latitud: number;
    longitud: number;
    precisionMetros?: number;
    registradaEn: string;
  },
): Promise<{ id: number }> {
  return solicitar(
    "/ubicaciones",
    { method: "POST", body: JSON.stringify(ubicacion) },
    token,
  );
}
