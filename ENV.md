# Entornos local y producción

El desarrollo normal separa por completo las conexiones locales de las de
producción. La única excepción intencional es `npm run prod`, que ejecuta la
API y la web en tu PC contra PostgreSQL de producción mediante un túnel SSH.

## Desarrollo local

Usá solamente:

```bash
npm run dev
```

El comando:

1. Levanta y espera PostgreSQL de Comercia en `localhost:5434`.
2. Aplica las migraciones existentes a esa base local.
3. Inicia NestJS en `:3001` y Next.js en `:3000`.

La configuración vive en [`.env.development`](.env.development). Es versionada
porque contiene exclusivamente valores seguros de desarrollo: el usuario local
de PostgreSQL es `postgres` y la contraseña es `postgres`.

Los comandos relacionados usan la misma configuración:

```bash
npm run db:up       # levanta PostgreSQL local y espera su healthcheck
npm run db:down     # detiene PostgreSQL local
npm run db:logs     # muestra logs de PostgreSQL local
npm run prisma:migrate
npm run prisma:studio
```

Si preferís abrirlos en terminales distintas:

```bash
# Terminal 1: PostgreSQL local + NestJS local
npm run dev:api

# Terminal 2: Next.js local
npm run dev:web
```

Al actualizar el esquema, generá una migración con `npm run prisma:migrate`.
Ese comando usa la misma base local de `localhost:5434`.

El archivo raíz `.env` queda ignorado por Git para overrides personales, pero
no decide el entorno de `npm run dev`. Esto evita que un puerto o URL de otro
proyecto redirija Prisma a la base equivocada.

## API y web locales con base de producción

`npm run prod` **no despliega** ni ejecuta NestJS/Next.js en el servidor.
Abre un túnel SSH privado hacia PostgreSQL de producción y después inicia los
dos procesos en tu PC:

```text
Next.js local :3000 → NestJS local :3001 → túnel local :5435 → PostgreSQL de producción
```

Preparación única:

```powershell
Copy-Item .env.production.local.example .env.production.local
```

Editá `.env.production.local` con el usuario y contraseña de PostgreSQL de
producción, manteniendo el host `127.0.0.1:5435`; agregá el valor exacto de
confirmación que indica el archivo. El archivo está ignorado por Git. Nunca
copies allí el `COOKIE_SECRET` de producción: usá un secreto local distinto.

Luego ejecutá:

```bash
npm run prod
```

También podés abrir cada proceso por separado:

```bash
# Terminal 1: túnel seguro hacia PostgreSQL de producción
npm run prod:tunnel

# Terminal 2: NestJS local usando la base de producción a través del túnel
npm run prod:api

# Terminal 3: Next.js local (siempre consume la API local :3001)
npm run prod:web
```

No combines `npm run prod` con los tres comandos separados: ambos intentan usar
los puertos `3000`, `3001` y `5435`. Si un puerto quedó ocupado por una ejecución
anterior, detené ese proceso con `Ctrl+C` antes de volver a iniciar.

El comando usa `PROD_SSH_HOST`, `PROD_SSH_USER` y `PROD_SSH_PORT` de ese
archivo (o el alias SSH `comercia` si no se configuran). El túnel se cierra
automáticamente cuando detengas el comando con `Ctrl+C`. La API local puede
leer y escribir producción, por eso no se ejecutan migraciones ni se expone
PostgreSQL directamente a Internet.

Para operar el stack que ya está desplegado en el servidor (sin iniciar nada
local), usá:

```bash
npm run server:up
npm run server:status
npm run server:logs
```

El despliegue normal sigue siendo `git push origin main`: GitHub Actions
publica las imágenes y el servidor las instala.

## Archivos de configuración

| Archivo | Entorno | Uso |
|---|---|---|
| [`.env.development`](.env.development) | Local | API, Prisma y Docker de desarrollo. |
| `.env` | Local, opcional | Overrides personales; ignorado por Git. |
| `.env.production.local` | Local con BD de producción | Credenciales de producción a través del túnel SSH; ignorado por Git. |
| [`apps/web/.env.development`](apps/web/.env.development) | Local | URL pública de la API para el navegador. |
| [`apps/web/.env.production`](apps/web/.env.production) | Producción | URL pública horneada en el build de Next.js. |
| `/opt/comercia/.env` | Producción | Secretos y configuración privada del servidor. |

Nunca pongas una URL, contraseña o túnel de producción en
`.env.development`, `apps/web/.env.development` o `.env`.
