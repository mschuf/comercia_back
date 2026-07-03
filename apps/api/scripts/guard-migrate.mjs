// Guardián de `prisma migrate dev`: bloquea el comando si DATABASE_URL apunta a
// la base de PRODUCCIÓN (túnel :15432 o el servidor LAN). `prisma migrate dev`
// puede proponer un RESET de la base — jamás debe correr contra producción.
// Las migraciones llegan a producción solas vía deploy (`prisma migrate deploy`).
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../../.env' });
loadEnv({ path: '.env', override: true });

const url = process.env.DATABASE_URL ?? '';
const esProduccion = url.includes(':15432') || url.includes('172.19.0.140');

if (esProduccion) {
  console.error('');
  console.error('🛑 BLOQUEADO: DATABASE_URL apunta a la base de PRODUCCIÓN.');
  console.error('   `prisma migrate dev` puede resetear la base y NO debe correr contra producción.');
  console.error('   Para crear migraciones: editá el .env de la raíz y activá la URL LOCAL');
  console.error('   (la línea comentada), corré la migración, y volvé a producción si querés.');
  console.error('');
  process.exit(1);
}
