import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { FOTO_MIMETYPES } from './impulsador.constants';

// Extensión de archivo para cada mimetype permitido (claves = FOTO_MIMETYPES)
const EXTENSION_POR_MIMETYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Solo se aceptan nombres generados por guardar(): UUID + extensión conocida.
// Cualquier otro valor se rechaza para impedir path traversal al armar rutas.
const NOMBRE_FOTO_REGEX = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

// Guarda y resuelve las fotos de visitas en el disco del servidor (UPLOADS_DIR).
@Injectable()
export class FotosService implements OnModuleInit {
  // Absoluta porque res.sendFile exige rutas absolutas
  private readonly dir: string;

  constructor(config: ConfigService) {
    this.dir = resolve(config.getOrThrow<string>('uploads.dir'), 'visitas');
  }

  onModuleInit(): void {
    mkdirSync(this.dir, { recursive: true });
  }

  async guardar(archivo: Express.Multer.File): Promise<string> {
    if (!FOTO_MIMETYPES.includes(archivo.mimetype)) {
      throw new BadRequestException(
        'Formato de imagen no soportado (JPG, PNG o WebP)',
      );
    }
    const extension = EXTENSION_POR_MIMETYPE[archivo.mimetype];
    const nombre = `${randomUUID()}.${extension}`;
    await writeFile(join(this.dir, nombre), archivo.buffer);
    return nombre;
  }

  // null si el nombre no es válido o el archivo ya no está en disco
  rutaAbsoluta(nombre: string): string | null {
    if (!NOMBRE_FOTO_REGEX.test(nombre)) {
      return null;
    }
    const ruta = join(this.dir, nombre);
    return existsSync(ruta) ? ruta : null;
  }

  // Best effort: que el archivo ya no exista no corta el flujo de la visita
  async borrar(nombre: string | null | undefined): Promise<void> {
    if (!nombre || !NOMBRE_FOTO_REGEX.test(nombre)) {
      return;
    }
    await unlink(join(this.dir, nombre)).catch(() => undefined);
  }
}
