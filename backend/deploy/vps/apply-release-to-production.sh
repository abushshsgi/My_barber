#!/usr/bin/env bash
set -euo pipefail
RELEASE_TGZ="${1:-}"
ROOT="/var/www/mysaloon/source"
FRONT="/opt/mysaloon/Mybarber"
VENV="/var/www/mysaloon/venv"
SVC="mysaloon.service"
BACKUP_DIR="/var/backups/mysaloon"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
WORKDIR="/tmp/mysaloon-release-${STAMP}"

if [[ -z "$RELEASE_TGZ" || ! -f "$RELEASE_TGZ" ]]; then
  echo "Usage: $0 release.tar.gz" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR" "$WORKDIR"
echo "=== PRE-CHECKS ==="
systemctl is-active postgresql redis-server "$SVC"
df -h / | tail -1

echo "=== PG BACKUP mysaloon_db ==="
sudo -u postgres pg_dump -Fc -f "${BACKUP_DIR}/mysaloon_db_${STAMP}.dump" mysaloon_db
echo "BACKUP_FILE=${BACKUP_DIR}/mysaloon_db_${STAMP}.dump"

echo "=== SOURCE SNAPSHOT ==="
tar -czf "${BACKUP_DIR}/source_${STAMP}.tar.gz" --exclude=node_modules --exclude=backend/.env -C /var/www/mysaloon source

echo "=== EXTRACT RELEASE ==="
tar -xzf "$RELEASE_TGZ" -C "$WORKDIR"

echo "=== RSYNC BACKEND + APPS (production tree) ==="
rsync -a "$WORKDIR/backend/" "${ROOT}/backend/"
find "${ROOT}/backend/bin" -name '*.sh' -exec sed -i 's/\r$//' {} +
rsync -a "$WORKDIR/apps/" "${ROOT}/apps/"
rsync -a "$WORKDIR/deploy/" "${ROOT}/deploy/"
chown -R mysaloon:mysaloon "$ROOT"

echo "=== RSYNC FRONTEND MONOREPO ==="
rsync -a --delete --exclude=node_modules --exclude=.git "$WORKDIR/" "${FRONT}/"
chown -R mysaloon:mysaloon "$FRONT"

echo "=== MIGRATION PLAN (hair_advisor) ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py migrate --plan 2>&1 | grep -E 'hair_advisor|\\[ \\]' | head -20 || true"

DBNAME="$(sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python -c \"import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); import django; django.setup(); from django.conf import settings; print(settings.DATABASES['default']['NAME'])\"")"
if [[ "$DBNAME" != "mysaloon_db" ]]; then
  echo "ABORT: DATABASE NAME is ${DBNAME}, expected mysaloon_db" >&2
  exit 1
fi
echo "DATABASE_TARGET=${DBNAME}"

echo "=== MIGRATE ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py migrate --noinput"
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py check"

install -m 644 "${ROOT}/backend/deploy/mysaloon-hair-aggregation-worker.service" /etc/systemd/system/mysaloon-hair-aggregation-worker.service
systemctl daemon-reload

echo "=== BUILD FRONTENDS (user+admin) ==="
git config --global --add safe.directory "${FRONT}" 2>/dev/null || true
sudo bash "${FRONT}/deploy/vps/deploy-frontends.sh" all

echo "=== RESTART API ==="
systemctl restart "$SVC"
sleep 5
systemctl is-active "$SVC"

echo "=== AGGREGATION WORKER ==="
systemctl enable --now mysaloon-hair-aggregation-worker.service
sleep 2
systemctl is-active mysaloon-hair-aggregation-worker.service

echo "=== SMOKE ==="
curl -sS -o /dev/null -w 'api_health=%{http_code}\n' https://api.mysaloon.uz/health/
curl -sS -o /dev/null -w 'www=%{http_code}\n' https://mysaloon.uz/ || true

git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "no_git"
test -d "${ROOT}/backend/hair_advisor" && echo HAIR_ADVISOR_INSTALLED=yes

echo "DEPLOY_STAMP=${STAMP}"