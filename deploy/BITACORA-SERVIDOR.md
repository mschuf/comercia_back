# Bitácora del servidor de producción (172.19.0.140)

Registro paso a paso de la instalación y configuración del servidor LAN de Comercia.
Sirve como runbook para reinstalar desde cero. **No contiene contraseñas ni tokens** —
solo referencias a dónde quedaron guardados.

## Datos del servidor

| Qué | Valor |
|---|---|
| IP (red privada de la empresa) | `172.19.0.140` |
| SO | Ubuntu Server 22.04 |
| Backend (API) | `http://172.19.0.140:1001` (health: `/api/v1/health`) |
| Frontend | `http://172.19.0.140:1002` |
| Carpeta de la app | `/opt/comercia` |
| Usuario de operación | `deploy` (grupo docker) |
| Acceso desde la máquina de Carlos | `ssh comercia` (clave `~/.ssh/comercia_admin`, config en `~/.ssh/config`) |
| Deploy automático | cron `*/3 min` → `deploy/auto-deploy.sh` (pull de GHCR + `up -d`) |
| Log del auto-deploy | `/home/deploy/comercia-autodeploy.log` |

## Arquitectura de deploy (modo LAN)

El servidor está en red privada: GitHub Actions no puede entrarle por SSH. Por eso:

```
git push a main
   → GitHub Actions: tests + build de imágenes → GHCR (job "deploy" queda en no-op)
   → el servidor consulta GHCR cada 3 min (auto-deploy.sh)
   → si hay imagen nueva: docker compose pull && up -d  (migraciones incluidas)
```

---

## Registro de pasos

### 2026-07-03 — Instalación inicial

**09:40 — Verificación de conectividad.** `Test-NetConnection 172.19.0.140 -Port 22`
desde la máquina de Carlos → TCP OK (ping bloqueado por firewall, esperable).

**~10:00 — Aprovisionamiento del servidor** (como root, vía ssh2 con contraseña):
- Reconocimiento: Ubuntu 22.04.5, 7 GB RAM, 184 GB libres, puertos 1001/1002 libres,
  salida a internet OK. Se detectó una instalación de `ubuntu-desktop-minimal` en
  curso desde otra sesión: se esperó a que liberara el lock de apt (~17 min) y el
  servidor se reinició al terminar.
- Instalado: Docker 29.6.1 + Compose v5.3 (get.docker.com), usuario `deploy`
  (grupo docker), clave pública `comercia_admin` en `deploy` y `root`, UFW activo
  con 22/1001/1002 (allow ANTES de enable).

**~10:25 — Stack configurado y arrancado**:
- `/opt/comercia/.env` creado (600, deploy) con `POSTGRES_PASSWORD` y `COOKIE_SECRET`
  aleatorios de 64 chars generados localmente. No se sobreescribe si ya existe.
- `docker login ghcr.io` como deploy con PAT `read:packages` de MorteiraGuarani
  (queda en `/home/deploy/.docker/config.json`; verificado contra la API de GHCR antes).
- Copiados `docker-compose.prod.yml` y `deploy/` a `/opt/comercia` (con fix de CRLF).
- Primer `pull` falló con timeout TLS transitorio hacia ghcr.io; el reintento funcionó.
- `up -d`: migraciones aplicadas (`migrate` → `Exited (0)`), API healthy en
  `http://172.19.0.140:1001/api/v1/health` (database up), front HTTP 200 en `:1002`.

**~10:35 — Deploy automático activado**:
- Crontab de `deploy`: auto-deploy cada 3 min + backup diario 03:00.
- Prueba manual de `auto-deploy.sh`: pull sin cambios → no reinicia nada (correcto).

**~10:45 — Prueba end-to-end del pipeline completo (v0.1.1)** ✅:
- `git push` → Actions verde en 8:20 (tests + build de ambas imágenes).
- 15 segundos después del build, el cron del servidor detectó el digest nuevo y
  recreó api y web (postgres siguió corriendo sin interrupciones). Log:
  `[2026-07-03 21:40:50] Deploy OK`. Health y front verificados tras la actualización.

**~10:50 — Seguridad y decisiones finales**:
- Instalados `fail2ban` (activo, jail sshd) y `unattended-upgrades` (habilitado).
  Explicación de las tres automatizaciones en [AUTOMATIZACION-SERVIDOR.md](AUTOMATIZACION-SERVIDOR.md).
- Decisión del usuario: NO rotar la contraseña de root y NO deshabilitar el login
  por contraseña en SSH (queda clave + contraseña; fail2ban como mitigación).
- Credenciales eliminadas del workspace local; queda solo la clave
  `~/.ssh/comercia_admin` (alias `ssh comercia` / `ssh comercia-root`).

**09:42 — Cambios en el repo para modo LAN** (este commit):
- `docker-compose.prod.yml`: API publicada en `${API_PORT:-1001}`, front en
  `${WEB_PORT:-1002}`; Caddy movido al perfil `domain` (no corre sin dominio).
- `apps/web/.env.production`: `NEXT_PUBLIC_API_URL=http://172.19.0.140:1001/api/v1`
  (se hornea en el bundle del front al construir la imagen).
- `.github/workflows/deploy.yml`: el job `deploy` detecta que no hay secrets de SSH
  y termina en no-op verde (el deploy real lo hace el servidor por pull).
- `deploy/auto-deploy.sh` (nuevo): pull de GHCR + `up -d` solo si cambió el digest,
  con lock (`flock`) para no solaparse.
