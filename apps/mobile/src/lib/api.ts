import { obtenerApiUrl } from "../config";
import type { SesionMovil } from "./sesion";
import type {
  CoordenadasMarcacion,
  MarcacionResumen,
  RendimientoImpulsador,
  RespuestaPaginada,
  TareaVisita,
  Visita,
  VisitaHoy,
} from "../types/impulsador";

const TIEMPO_ESPERA_MS = 15_000;

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
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_ESPERA_MS);
  let response: Response;
  try {
    response = await fetch(`${obtenerApiUrl()}${ruta}`, {
      ...opciones,
      signal: controlador.signal,
      headers: {
        Accept: "application/json",
        ...(opciones.body && !(opciones.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch (error) {
    if (controlador.signal.aborted) {
      throw new Error("El servidor tardó demasiado en responder.");
    }
    throw error;
  } finally {
    clearTimeout(temporizador);
  }
  if (!response.ok) {
    const mensaje = await mensajeError(response);
    if (response.status === 404 && ruta.startsWith("/auth/mobile/")) {
      throw new ErrorApi(
        "El servidor configurado no tiene habilitado el login móvil. El backend debe publicar las rutas de acceso móvil antes de poder iniciar sesión.",
        response.status,
      );
    }
    throw new ErrorApi(mensaje, response.status);
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

export function obtenerUsuarioActual(
  token: string,
): Promise<{ usuario: SesionMovil["usuario"] }> {
  return solicitar("/auth/me", {}, token);
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

export function obtenerAgendaHoy(
  token: string,
): Promise<RespuestaPaginada<VisitaHoy>> {
  return solicitar("/repositor/visitas-hoy?page=1&limit=50", {}, token);
}

export function obtenerVisita(
  token: string,
  visitaId: number,
): Promise<Visita> {
  return solicitar(`/visitas/${visitaId}`, {}, token);
}

export function obtenerMarcaciones(
  token: string,
  page = 1,
): Promise<RespuestaPaginada<MarcacionResumen>> {
  return solicitar(`/visitas?page=${page}&limit=20`, {}, token);
}

export function obtenerRendimiento(
  token: string,
): Promise<RendimientoImpulsador> {
  return solicitar("/repositor/rendimiento", {}, token);
}

export function iniciarVisita(
  token: string,
  localId: number,
  ubicacion: CoordenadasMarcacion,
): Promise<Visita> {
  return solicitar(
    "/visitas",
    {
      method: "POST",
      body: JSON.stringify({ localId, ...ubicacion }),
    },
    token,
  );
}

export function finalizarVisita(
  token: string,
  visitaId: number,
  ubicacion: CoordenadasMarcacion,
): Promise<Visita> {
  return solicitar(
    `/visitas/${visitaId}/finalizar`,
    { method: "POST", body: JSON.stringify(ubicacion) },
    token,
  );
}

export function finalizarVisitaMovil(
  token: string,
  entradaClaveMovil: string,
  ubicacion: CoordenadasMarcacion,
): Promise<Visita> {
  return solicitar(
    "/visitas/movil/finalizar",
    {
      method: "POST",
      body: JSON.stringify({ entradaClaveMovil, ...ubicacion }),
    },
    token,
  );
}

export function actualizarTareaVisita(
  token: string,
  visitaId: number,
  tarea: TareaVisita,
  completada: boolean,
): Promise<Visita> {
  return solicitar(
    `/visitas/${visitaId}/tareas/${tarea.id}`,
    { method: "PATCH", body: JSON.stringify({ completada }) },
    token,
  );
}

async function subirFoto(
  token: string,
  ruta: string,
  uri: string,
): Promise<Visita> {
  const formulario = new FormData();
  formulario.append("foto", {
    uri,
    name: `evidencia-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);
  return solicitar(ruta, { method: "POST", body: formulario }, token);
}

export function subirFotoTarea(
  token: string,
  visitaId: number,
  visitaTareaId: number,
  uri: string,
): Promise<Visita> {
  return subirFoto(
    token,
    `/visitas/${visitaId}/tareas/${visitaTareaId}/foto`,
    uri,
  );
}

export function subirFotoPresencia(
  token: string,
  visitaId: number,
  uri: string,
): Promise<Visita> {
  return subirFoto(token, `/visitas/${visitaId}/foto-presencia`, uri);
}
