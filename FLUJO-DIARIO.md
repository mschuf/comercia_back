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
