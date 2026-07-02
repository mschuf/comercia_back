# Checklist de configuración — local y producción

Qué falta configurar (aparte de los `.env`, explicados en [ENV.md](ENV.md)) para que
el proyecto funcione en tu máquina y se despliegue solo en el servidor. Todo el
código ya está en el repo; esto es puro setup de cuentas y servidor, **una sola vez**.

## En local (2 minutos)

- [ ] **Docker Desktop corriendo** y levantar el Postgres de desarrollo:

  ```bash
  npm run db:up
  ```

- [ ] **Aplicar la migración inicial** (la base local todavía no tiene la tabla `users`):

  ```bash
  npm run prisma:migrate
  ```

- [ ] Opcional: crear el `.env` de la raíz (`copy .env.example .env`). Hoy funciona
  sin él porque todo tiene valores por defecto.

Con eso, `npm run dev` levanta web (`:3000`) y api (`:3001`).

## En producción (una sola vez, en este orden)

### 1. El servidor VPS

Comandos exactos en [DEPLOY.md](DEPLOY.md) sección 1.

- [ ] Instalar Docker (`curl -fsSL https://get.docker.com | sh`).
- [ ] Crear el usuario `deploy` y agregarlo al grupo `docker`.
- [ ] Firewall: solo 22, 80 y 443 (`ufw`).
- [ ] Generar el par de claves SSH: la **pública** a `authorized_keys` del usuario
  `deploy`, la **privada** al secret de GitHub (paso 2).
- [ ] Crear `/opt/comercia` con dueño `deploy`.
- [ ] **`docker login ghcr.io` en el servidor** con un PAT de GitHub (cuenta `mschuf`)
  con permiso `read:packages`. ⚠️ Sin esto el servidor no puede bajar las imágenes
  (GHCR las publica privadas por defecto). Es el paso que más gente olvida.

### 2. GitHub → Settings → Secrets and variables → Actions

Recomendado: crearlos dentro del **environment `production`** (el workflow ya apunta ahí).

| Tipo | Nombre | Valor |
|---|---|---|
| Secret | `DEPLOY_HOST` | IP o dominio del servidor |
| Secret | `DEPLOY_USER` | `deploy` |
| Secret | `DEPLOY_SSH_KEY` | contenido completo de la clave privada |
| Secret | `DEPLOY_PORT` | (opcional) solo si SSH no usa el puerto 22 |
| Variable | `NEXT_PUBLIC_API_URL` | `https://tudominio.com/api/v1` |

### 3. DNS

- [ ] Registro `A` del dominio apuntando a la IP del servidor. Con eso Caddy emite
  y renueva el certificado HTTPS solo.
- [ ] ¿Todavía sin dominio? Usar `DOMAIN=:80` en el `.env` del servidor y entrar
  por `http://IP-del-servidor` (sin HTTPS, solo para probar).

### 4. El `.env` del servidor

- [ ] Copiar [deploy/.env.production.example](deploy/.env.production.example) a
  `/opt/comercia/.env` y completarlo. `POSTGRES_PASSWORD` y `COOKIE_SECRET` están
  vacíos a propósito: generarlos con `openssl rand -hex 32` (el stack se niega a
  arrancar si quedan vacíos).

### 5. Primer deploy

- [ ] GitHub → Actions → **Deploy** → *Run workflow* (construye ambas imágenes
  aunque no haya cambios de código).
- [ ] Verificar en el servidor:

  ```bash
  cd /opt/comercia
  docker compose -f docker-compose.prod.yml ps      # postgres, api, web, caddy: "Up (healthy)"
  curl -s https://tudominio.com/api/v1/health
  ```

A partir de acá, **cada `git push` a `main` despliega solo** (si lint y tests pasan).

## Después del primer deploy (recomendado, no bloqueante)

- [ ] Cron de backups diarios (DEPLOY.md §5):

  ```
  0 3 * * * bash /opt/comercia/deploy/backup.sh >> /home/deploy/comercia-backup.log 2>&1
  ```

- [ ] SSH solo con clave: `PasswordAuthentication no` en `/etc/ssh/sshd_config`.
- [ ] `apt install fail2ban unattended-upgrades`.
- [ ] Repasar el checklist de seguridad completo de [DEPLOY.md](DEPLOY.md) §7.

## Detalles para no sorprenderse

- Todo el pipeline usa la cuenta **`mschuf`** (repo e imágenes `ghcr.io/mschuf/...`):
  el PAT del paso 1 debe ser de esa cuenta.
- Si cambiás el dominio: además de tocar el `.env` del servidor, hay que **relanzar
  el workflow Deploy** para rehornear `NEXT_PUBLIC_API_URL` en la imagen del front
  (se incrusta en el build, no se lee en runtime).
- Rollback a una versión anterior: cambiar `API_TAG`/`WEB_TAG` en el `.env` del
  servidor por el SHA del commit bueno y `docker compose up -d` (DEPLOY.md §6).
