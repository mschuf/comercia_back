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

**09:42 — Cambios en el repo para modo LAN** (este commit):
- `docker-compose.prod.yml`: API publicada en `${API_PORT:-1001}`, front en
  `${WEB_PORT:-1002}`; Caddy movido al perfil `domain` (no corre sin dominio).
- `apps/web/.env.production`: `NEXT_PUBLIC_API_URL=http://172.19.0.140:1001/api/v1`
  (se hornea en el bundle del front al construir la imagen).
- `.github/workflows/deploy.yml`: el job `deploy` detecta que no hay secrets de SSH
  y termina en no-op verde (el deploy real lo hace el servidor por pull).
- `deploy/auto-deploy.sh` (nuevo): pull de GHCR + `up -d` solo si cambió el digest,
  con lock (`flock`) para no solaparse.
