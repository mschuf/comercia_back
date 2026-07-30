// Subida y visualización de archivos (fotos de visitas). El apiFetch estándar
// fuerza Content-Type JSON; acá el body es FormData y el boundary lo pone el
// navegador, así que no se puede fijar el header.
import { API_URL, ApiError } from "@/lib/api";

function extraerMensaje(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message: string | string[] }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

async function enviarFormulario<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, extraerMensaje(data, `Error ${res.status}`));
  }
  return data as T;
}

// Sube un archivo por multipart y devuelve la respuesta JSON tipada.
export async function apiSubirFoto<T>(
  path: string,
  archivo: File | Blob,
  campo = "foto",
): Promise<T> {
  const formData = new FormData();
  formData.append(campo, archivo);
  return enviarFormulario<T>(path, formData);
}

// Reporta una novedad con el comentario y la evidencia exigidos por el endpoint.
export async function apiReportarNovedad<T>(
  path: string,
  comentario: string,
  foto: File | Blob,
): Promise<T> {
  const formData = new FormData();
  formData.append("comentario", comentario);
  formData.append("foto", foto);
  return enviarFormulario<T>(path, formData);
}

// URL absoluta de una foto de visita. El <img> que la muestre debe llevar
// crossOrigin="use-credentials" para que viaje la cookie de sesión.
export function urlFotoVisita(nombre: string): string {
  return `${API_URL}/visitas/fotos/${encodeURIComponent(nombre)}`;
}

// La evidencia de una novedad se sirve por id, con autorización del destinatario
// o del repositor que la reportó.
export function urlFotoNovedad(id: number): string {
  return `${API_URL}/notificaciones/${encodeURIComponent(String(id))}/foto`;
}
