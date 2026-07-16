// Promesa sobre navigator.geolocation con errores en español.
// Solo funciona en el navegador (usar desde Client Components).
export function obtenerUbicacion(
  opciones: PositionOptions = {},
): Promise<{ latitud: number; longitud: number; precision: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Este dispositivo no soporta geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        resolve({
          latitud: posicion.coords.latitude,
          longitud: posicion.coords.longitude,
          precision: posicion.coords.accuracy,
        });
      },
      (err) => {
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Permiso de ubicación denegado. Habilitá la ubicación para continuar."
              : "No se pudo obtener tu ubicación. Verificá el GPS e intentá de nuevo.",
          ),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        ...opciones,
      },
    );
  });
}
