# Flujo diario de trabajo

## Subir un cambio a producción (back, front o ambos)

```bash
git add .
git commit -m "mi cambio"
git push
```

Eso es todo. En **~10 minutos** está corriendo en el servidor:

1. GitHub Actions corre lint + tests (si fallan, **no se despliega nada**)
2. Construye solo la imagen que cambió (api, web o ambas) y la publica en GHCR
3. El servidor revisa GHCR cada 3 minutos y se actualiza solo (migraciones incluidas)

## Mirar el proceso en vivo (opcional)

```bash
gh run watch                                        # el build en GitHub
ssh comercia "tail -f ~/comercia-autodeploy.log"    # la llegada al servidor
```

## URLs de producción

| Qué | URL |
|---|---|
| Frontend | http://172.19.0.140:1002 |
| API | http://172.19.0.140:1001/api/v1 |
| Health (API + base de datos) | http://172.19.0.140:1001/api/v1/health |

## Comandos útiles en el servidor (`ssh comercia`)

```bash
cd /opt/comercia
docker compose -f docker-compose.prod.yml ps            # estado de los servicios
docker compose -f docker-compose.prod.yml logs -f api   # logs en vivo (api, web, postgres)
docker compose -f docker-compose.prod.yml restart api   # reiniciar un servicio
bash deploy/backup.sh                                   # backup manual de la base
```

**Rollback** (volver a una versión anterior): editar `/opt/comercia/.env` y poner
`API_TAG=<sha-del-commit-bueno>` (y/o `WEB_TAG=`), después
`docker compose -f docker-compose.prod.yml up -d`. Los SHA están en `git log --oneline`.
Para volver a lo último: tags en `latest` y repetir. Ojo: si hubo migración de base
destructiva, el rollback de código no la revierte — restaurar backup si hace falta.

## Escritorio remoto del servidor (VNC)

El servidor corre TigerVNC (sesión **XFCE** del usuario `deploy`, display `:1` —
GNOME crashea bajo VNC y choca con la sesión del monitor físico; XFCE no).
El firewall de la red de la empresa bloquea el puerto 5901 entre VLANs, así que
se entra **por túnel SSH** (que además viaja cifrado):

1. Doble clic en `VNC-Servidor-Comercia.bat` (está en el Escritorio de la PC de
   Carlos) — o en una terminal: `ssh -N -L 5901:localhost:5901 comercia`.
   Dejar esa ventana abierta.
2. Abrir TightVNC Viewer y conectarse a `localhost::5901`.
3. La contraseña VNC la tiene Carlos (8 caracteres; se cambia con
   `ssh comercia vncpasswd`).

El servicio (`vncserver.service`) arranca solo con el servidor y se reinicia si
se cae. Nota: es un escritorio *virtual* (no el monitor físico del servidor) —
ideal para administrar. Para conectarse desde otra PC: esa máquina necesita la
clave SSH o su propia entrada; pedírsela a Carlos.

## Ver / administrar la base de datos de producción

PostgreSQL corre en Docker y escucha **solo en el loopback del servidor** (nunca
expuesto a la red). Se accede por túnel SSH:

**Con DBeaver (gráfico, desde Windows):**
1. Doble clic en `BD-Servidor-Comercia.bat` (Escritorio) — abre el túnel; dejar abierto.
2. DBeaver → Nueva conexión → PostgreSQL → host `localhost`, puerto `15432`,
   base `comercia`. Usuario y contraseña: en `Conexion-BD-Comercia.txt` del
   Escritorio (guardarla en un gestor y borrar el archivo).

**Con psql (terminal, dentro del servidor — por VNC o `ssh comercia`):**

```bash
cd /opt/comercia
docker compose -f docker-compose.prod.yml exec postgres psql -U comercia comercia
#  \dt         → listar tablas          \d users → estructura de una tabla
#  SELECT * FROM _prisma_migrations;    → migraciones aplicadas
#  \q          → salir
```

## Cambios de estructura (migraciones): cómo funciona el control

**La estructura la controlás vos siempre** — en producción no se inventa nada:

1. Cambiás `apps/api/prisma/schema.prisma` en tu máquina.
2. `npm run prisma:migrate` → Prisma te genera el SQL en
   `apps/api/prisma/migrations/...` y lo aplica a tu base LOCAL. **Ahí lo revisás.**
3. Recién cuando hacés `git push`, ese SQL viaja; el deploy lo aplica en producción
   (servicio `migrate` = `prisma migrate deploy`, que solo ejecuta migraciones
   pendientes ya commiteadas — nunca genera SQL nuevo).

**Ejecución manual en producción** (si querés correr una migración vos mismo, por
ejemplo tras restaurar un backup):

```bash
cd /opt/comercia
docker compose -f docker-compose.prod.yml run --rm migrate
```

Es seguro repetirlo: si no hay migraciones pendientes, no hace nada.

## Pendientes (no bloquean nada)

- **Admin del repo**: si el dueño de la cuenta `mschuf` te da rol Admin
  (Settings → Collaborators → Admin), se puede activar protección de rama
  (nada entra a `main` sin PR verde) y environments con aprobación manual.
- **Dominio público**: cuando haya, Caddy con HTTPS automático ya está listo —
  se activa con el perfil `domain` de compose (`--profile domain`), se apunta el
  DNS al servidor y se cambia la URL en `apps/web/.env.production` + push.
  Pasos completos en [DEPLOY.md](DEPLOY.md).

## Más documentación

- [SETUP.md](SETUP.md) — checklist de configuración desde cero
- [ENV.md](ENV.md) — qué hace cada archivo `.env`
- [DEPLOY.md](DEPLOY.md) — arquitectura de deploy completa
- [deploy/AUTOMATIZACION-SERVIDOR.md](deploy/AUTOMATIZACION-SERVIDOR.md) — cron, fail2ban y unattended-upgrades explicados
- [deploy/BITACORA-SERVIDOR.md](deploy/BITACORA-SERVIDOR.md) — cómo se instaló el servidor, paso a paso
