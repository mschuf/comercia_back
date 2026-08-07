const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

export function obtenerApiUrl(): string {
  if (!apiUrl) {
    throw new Error(
      "Falta EXPO_PUBLIC_API_URL. Copiá .env.example a .env y configurá la URL de la API.",
    );
  }
  return apiUrl;
}
