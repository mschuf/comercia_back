import * as SecureStore from "expo-secure-store";

const CLAVE_SESION = "comercia.mobile.sesion";

export interface UsuarioSesion {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  celular: string;
  empresa: { id: number; nombre: string };
  rol: { id: number; descripcion: string } | null;
}

export function esSesionImpulsador(sesion: SesionMovil): boolean {
  return sesion.usuario.rol?.descripcion.toLowerCase() === "impulsador";
}

export interface SesionMovil {
  token: string;
  usuario: UsuarioSesion;
}

export async function guardarSesion(sesion: SesionMovil): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(sesion), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

export async function obtenerSesion(): Promise<SesionMovil | null> {
  const valor = await SecureStore.getItemAsync(CLAVE_SESION);
  if (!valor) return null;

  try {
    const sesion = JSON.parse(valor) as SesionMovil;
    if (!sesion.token || !sesion.usuario?.correo) {
      throw new Error("Sesión inválida");
    }
    return sesion;
  } catch {
    await SecureStore.deleteItemAsync(CLAVE_SESION);
    return null;
  }
}

export async function borrarSesion(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}
