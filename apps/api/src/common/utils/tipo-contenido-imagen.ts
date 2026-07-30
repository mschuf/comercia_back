import { extname } from 'node:path';

const MIME_POR_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function tipoContenidoImagen(nombre: string): string {
  return MIME_POR_EXTENSION[extname(nombre)] ?? 'application/octet-stream';
}
