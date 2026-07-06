// Payload del JWT de sesión: solo el id del usuario (sub).
export interface TokenPayload {
  sub: number;
}
