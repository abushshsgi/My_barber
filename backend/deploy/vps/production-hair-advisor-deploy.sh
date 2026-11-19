#!/usr/bin/env bash
# Controlled Hair Advisor production deploy (additive migrations only).
set -euo pipefail

ROOT="/var/www/mysaloon/source"
VENV="/var/www/mysaloon/venv"
SVC="mysaloon.service"
BACKUP_DIR="/var/backups/mysaloon"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_TGZ="${1:-}"

if [[ -z "$RELEASE_TGZ" || ! -f "$RELEASE_TGZ" ]]; then
  echo "Usage: $0 /path/to/mysaloon-release.tar.gz" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
echo "=== PRE: service + disk ==="
systemctl is-active postgresql "$SVC" redis-server
df -h / | tail -1

echo "=== BACKUP: PostgreSQL mysaloon_db ==="
sudo -u postgres pg_dump -Fc -f "${BACKUP_DIR}/mysaloon_db_${STAMP}.dump" mysaloon_db
ls -lh "${BACKUP_DIR}/mysaloon_db_${STAMP}.dump"

echo "=== SNAPSHOT: current source (excluding venv/node_modules) ==="
tar -czf "${BACKUP_DIR}/source_snapshot_${STAMP}.tar.gz" \
  --exclude=node_modules --exclude=backend/.env \
  -C /var/www/mysaloon source

echo "=== EXTRACT: release overlay ==="
tar -xzf "$RELEASE_TGZ" -C /var/www/mysaloon
chown -R mysaloon:mysaloon "$ROOT"

echo "=== MIGRATE: verify target ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python -c \"import os,dj_database_url; from django.conf import settings; import django; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); django.setup(); print(settings.DATABASES['default'].get('NAME'))\""
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py showmigrations hair_advisor | tail -5"

echo "=== MIGRATE: apply ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py migrate --noinput"

echo "=== DJANGO CHECK ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py check"

echo "=== AGGREGATION WORKER UNIT (install, not enable until migrate OK) ==="
install -m 644 "${ROOT}/backend/deploy/mysaloon-hair-aggregation-worker.service" /etc/systemd/system/mysaloon-hair-aggregation-worker.service
systemctl daemon-reload

echo "=== RESTART API ==="
systemctl restart "$SVC"
sleep 4
systemctl is-active "$SVC"

echo "=== ENABLE AGGREGATION WORKER ==="
systemctl enable --now mysaloon-hair-aggregation-worker.service
sleep 2
systemctl is-active mysaloon-hair-aggregation-worker.service || systemctl status mysaloon-hair-aggregation-worker.service --no-pager | head -15

echo "=== HEALTH ==="
curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/

echo "=== DONE: ${STAMP} ==="