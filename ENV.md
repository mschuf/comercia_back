# Guía de los archivos `.env` del proyecto

Hay varios `.env` porque cada pieza del stack (Docker, NestJS, Next.js, Prisma) lee
su configuración desde un lugar distinto. Esta es la regla general:

> **En desarrollo** la configuración vive en archivos `.env` de tu máquina.
> **En producción** ningún archivo `.env` con secretos viaja dentro de las imágenes
> Docker: los contenedores reciben las variables desde `docker-compose.prod.yml`,
> que a su vez las lee del único `.env` del servidor (`/opt/comercia/.env`).
> La única excepción son los `.env` del front (`apps/web/.env.development` y
> `.env.production`), que solo llevan variables públicas y se commitean a propósito.

## Mapa rápido

| Archivo | ¿Existe en git? | Quién lo lee | Para qué |
|---|---|---|---|
| `.env` (raíz) | No (ignorado) | Docker Compose de desarrollo, la API NestJS y el CLI de Prisma | **El único `.env` local**: backend + base de datos |
| `.env.example` (raíz) | Sí | Nadie (es plantilla) | Base para crear tu `.env` de la raíz |
| `apps/api/.env` | No (ignorado) | La API y Prisma, **solo si lo creás** | Override opcional; pisa al de la raíz |
| `apps/web/.env.development` | **Sí** | Next.js en `next dev` (automático) | Variables públicas del front en desarrollo |
| `apps/web/.env.production` | **Sí** | Next.js en `next build` (automático) | Variables públicas del front en producción |
| `deploy/.env.production.example` | Sí | Nadie (es plantilla) | Base para crear el `/opt/comercia/.env` **del servidor** |
| `/opt/comercia/.env` (servidor) | No (solo en el VPS) | `docker compose -f docker-compose.prod.yml` | Toda la config de producción |

## Cada archivo en detalle

### 1. `.env` de la raíz — EL archivo de desarrollo

Se crea copiando la plantilla (`copy .env.example .env`). Es el **único** `.env`
local del proyecto y lo leen **tres** cosas:

- **Docker Compose de desarrollo** (`npm run db:up`): interpola `POSTGRES_USER`,
  `POSTGRES_PASSWORD`, `POSTGRES_DB` y `POSTGRES_PORT` para el contenedor de
  Postgres local. Si el archivo no existe, usa los defaults (`postgres`/`postgres`/`comercia`/`5432`).
- **La API NestJS**: carga `['.env', '../../.env']`
  ([app.module.ts:17](apps/api/src/app.module.ts#L17)); como `apps/api/.env` no
  existe por defecto, este es el que manda.
- **El CLI de Prisma** (migraciones, studio): [prisma.config.ts](apps/api/prisma.config.ts)
  también lo carga.

Las variables que falten toman los defaults seguros definidos en
[env.schema.ts](apps/api/src/config/env.schema.ts) (validados con Zod al arrancar:
si algo está mal formado, la API no arranca y te dice exactamente qué).

Next.js **no** lee este archivo (solo mira dentro de `apps/web/`).

### 2. `apps/api/.env` — override opcional (por defecto no existe)

Si algún día necesitás pisar una variable **solo para la API** sin tocar el `.env`
de la raíz, podés crear este archivo: tanto NestJS como el CLI de Prisma lo cargan
con prioridad sobre el de la raíz. Es un arma de doble filo: si te olvidás de que
existe, vas a editar la raíz y preguntarte por qué no cambia nada — por eso el
proyecto ya no lo trae por defecto.

### 3. `apps/web/.env.development` y `.env.production` — el frontend

Next.js **elige el archivo solo**, según el comando:

- `next dev` (desarrollo local) → carga `.env.development` (`http://localhost:3001/api/v1`)
- `next build` (el build de la imagen Docker) → carga `.env.production` (tu dominio real)

Por eso estos dos **sí se commitean**: solo contienen variables `NEXT_PUBLIC_*`,
que son públicas por definición. Cuando tengas el dominio real, editás
`.env.production` una vez, hacés push, y el pipeline reconstruye el front con esa URL.

Si algún día necesitás un override personal en tu máquina, podés crear
`apps/web/.env.local` (ignorado por git): pisa a los otros dos en desarrollo.

⚠️ Regla de oro: todo lo que empiece con `NEXT_PUBLIC_` **se incrusta en el bundle
de JavaScript que se envía al navegador**. Cualquiera puede verlo. En estos archivos
jamás va un secreto, una contraseña ni una URL interna.

### 4. `/opt/comercia/.env` — el único `.env` de producción (en el servidor)

Se crea una sola vez en el VPS copiando [deploy/.env.production.example](deploy/.env.production.example)
(pasos en [DEPLOY.md](DEPLOY.md)). Lo lee `docker compose` en el servidor para
interpolar `docker-compose.prod.yml`, y de ahí cada contenedor recibe sus variables:

- `postgres` recibe `POSTGRES_USER/PASSWORD/DB`
- `api` y `migrate` reciben `DATABASE_URL` (armada apuntando al contenedor `postgres`),
  `COOKIE_SECRET`, `CORS_ORIGINS`, etc.
- `caddy` recibe `DOMAIN` (con dominio real emite HTTPS solo)
- `API_TAG` / `WEB_TAG` eligen qué versión de las imágenes correr (rollback)

Los `.env` con secretos **nunca** llegan a producción: el [.dockerignore](.dockerignore)
los excluye del build de las imágenes y el `.gitignore` los excluye de git. (Los dos
`.env` públicos del front son la excepción deliberada: entran al build justamente
para que Next hornee sus `NEXT_PUBLIC_*` en el bundle.)

**Caso especial**: `NEXT_PUBLIC_API_URL` en producción NO está en el `.env` del
servidor. Como se incrusta en el bundle durante el *build*, vive commiteada en
`apps/web/.env.production` y Next la carga sola cuando el pipeline construye la
imagen del front. Si cambiás el dominio: editás ese archivo, push, y listo.

## Qué variable hace qué

| Variable | La usa | Para qué | Dev | Prod |
|---|---|---|---|---|
| `DATABASE_URL` | API + Prisma CLI | Conexión a Postgres | `localhost:5432` | La arma el compose apuntando a `postgres:5432` |
| `PORT` | API | Puerto de NestJS | `3001` | `3001` (interno del contenedor) |
| `NODE_ENV` | API | Modo de ejecución | `development` | `production` (fijado en la imagen) |
| `FRONTEND_URL` | API | URL pública del front | `http://localhost:3000` | `https://tudominio.com` |
| `CORS_ORIGINS` | API | Orígenes permitidos (separados por coma) | `http://localhost:3000` | `https://tudominio.com` |
| `COOKIE_SECRET` | API | Firma de cookies (mín. 32 chars) | valor de ejemplo | **obligatorio**, aleatorio (`openssl rand -hex 32`) |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | API | Rate limiting | 100 req/min | igual (ajustable) |
| `SWAGGER_ENABLED` | API | Docs en `/api/docs` | `true` | `false` |
| `NEXT_PUBLIC_API_URL` | Front (navegador) | Adónde llama el browser | `apps/web/.env.development` | `apps/web/.env.production` (horneada en el build) |
| `POSTGRES_USER/PASSWORD/DB/PORT` | Contenedor Postgres | Credenciales de la base | `postgres`/`postgres` | **obligatorias**, aleatorias |
| `DOMAIN` | Caddy (solo perfil `domain`) | Dominio público + HTTPS | — | `tudominio.com` (cuando haya dominio) |
| `API_PORT` / `WEB_PORT` | Compose prod (modo LAN) | Puertos publicados de api y web | — | `1001` / `1002` |
| `API_TAG` / `WEB_TAG` | Compose prod | Versión de imagen a correr | — | `latest`, o un SHA para rollback |

## Precedencia (cuando una variable está en dos lados)

Para la API, de mayor a menor prioridad:

1. Variable de entorno real del proceso (lo que inyecta Docker en producción)
2. `apps/api/.env` (solo si lo creaste — por defecto no existe)
3. `.env` de la raíz
4. Defaults del esquema Zod ([env.schema.ts](apps/api/src/config/env.schema.ts))

En producción los pasos 2 y 3 no existen (no hay archivos), así que manda siempre
lo que definas en `/opt/comercia/.env` → `docker-compose.prod.yml`.

## Reglas de seguridad

- Nunca commitear un `.env` real (el `.gitignore` cubre `**/.env` y `.env.*`; las
  plantillas `.example` son la única excepción).
- Nunca poner secretos en variables `NEXT_PUBLIC_*` (van al navegador).
- En producción, `COOKIE_SECRET` y `POSTGRES_PASSWORD` se generan con
  `openssl rand -hex 32` — las plantillas los dejan vacíos a propósito para que el
  stack se niegue a arrancar si te olvidás de completarlos.
