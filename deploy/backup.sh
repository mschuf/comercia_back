#!/usr/bin/env bash
# Backup de PostgreSQL con pg_dump desde el contenedor.
# Uso: bash /opt/comercia/deploy/backup.sh
# Cron sugerido (diario a las 03:00):
#   0 3 * * * bash /opt/comercia/deploy/backup.sh >> /home/deploy/comercia-backup.log 2>&1
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

cd "$APP_DIR"
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump --clean --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"' \
  | gzip > "$BACKUP_DIR/comercia-$STAMP.sql.gz"

# Borra backups con más de KEEP_DAYS días
find "$BACKUP_DIR" -name 'comercia-*.sql.gz' -mtime +"$KEEP_DAYS" -delete

echo "Backup OK: $BACKUP_DIR/comercia-$STAMP.sql.gz"
