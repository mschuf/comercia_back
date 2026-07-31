export const AUTH_COOKIE = 'comercia_token';
// Sesión deslizante: se renueva en cada request autenticada. Mientras el
// usuario continúe usando Comercia, no necesita volver a iniciar sesión.
export const TOKEN_DURACION = '30d';
export const TOKEN_DURACION_MS = 30 * 24 * 60 * 60 * 1000;
