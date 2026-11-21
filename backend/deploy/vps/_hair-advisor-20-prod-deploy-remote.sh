#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="/var/backups/mysaloon"
ROOT="/var/www/mysaloon/source"
FRONT="/opt/mysaloon/Mybarber"
VENV="/var/www/mysaloon/venv"
SVC="mysaloon.service"
COMMIT="10e13bbf714df7f30aa60ec300ebe2c4fc28918a"
RELEASE="/tmp/mysaloon-release-${STAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
echo "STAMP=${STAMP}"

echo "=== PRE: services ==="
systemctl is-active postgresql "$SVC" redis-server
df -h / | tail -1

echo "=== BACKUP: PostgreSQL ==="
sudo -u postgres pg_dump -Fc -f "${BACKUP_DIR}/mysaloon_db_${STAMP}.dump" mysaloon_db
ls -lh "${BACKUP_DIR}/mysaloon_db_${STAMP}.dump"

echo "=== BACKUP: source tree ==="
tar -czf "${BACKUP_DIR}/source_snapshot_${STAMP}.tar.gz" \
  --exclude=node_modules --exclude=backend/.env \
  -C /var/www/mysaloon source
ls -lh "${BACKUP_DIR}/source_snapshot_${STAMP}.dump" 2>/dev/null || ls -lh "${BACKUP_DIR}/source_snapshot_${STAMP}.tar.gz"

echo "=== RELEASE ARCHIVE from ${COMMIT} ==="
cd "$FRONT"
git fetch origin main
git archive --format=tar.gz "$COMMIT" -o "$RELEASE"
ls -lh "$RELEASE"

echo "=== APPLY RELEASE (apply-release-to-production) ==="
bash "${ROOT}/backend/deploy/vps/apply-release-to-production.sh" "$RELEASE"

echo "=== DEPLOY COMMIT MARKER ==="
echo "$COMMIT" > /var/lib/mysaloon/deployed-sha
echo "$COMMIT" > "${FRONT}/../deployed-ha-commit.txt"
git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo "source_no_git"
echo "DEPLOYED_COMMIT=${COMMIT}"