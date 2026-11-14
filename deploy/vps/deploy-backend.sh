#!/usr/bin/env bash
# VPS da Django API ni yangilaydi (mysaloon.service).
# Ishlatish (serverda root): bash deploy/vps/deploy-backend.sh
set -euo pipefail

ROOT="${MYSALOON_ROOT:-/var/www/mysaloon/source}"
VENV="${MYSALOON_VENV:-/var/www/mysaloon/venv}"
SVC="${MYSALOON_API_SERVICE:-mysaloon.service}"

cd "$ROOT"
git fetch origin
git pull --ff-only origin main
chown -R mysaloon:mysaloon "$ROOT"
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py migrate --noinput"

echo "=== Try-on systemd units (VPS paths) ==="
install -m 644 "${ROOT}/backend/deploy/mysaloon-tryon-worker.service" /etc/systemd/system/mysaloon-tryon-worker.service
install -m 644 "${ROOT}/backend/deploy/mysaloon-tryon-worker@.service" /etc/systemd/system/mysaloon-tryon-worker@.service
systemctl daemon-reload
# Default: try-on workers run inside mysaloon.service (backend/bin/start.sh). Standalone unit stays disabled.
if [ "${MYSALOON_STANDALONE_TRYON_WORKER:-0}" = "1" ]; then
  systemctl enable mysaloon-tryon-worker.service
  systemctl restart mysaloon-tryon-worker.service
  systemctl is-active mysaloon-tryon-worker.service
else
  systemctl disable --now mysaloon-tryon-worker.service 2>/dev/null || true
  systemctl stop 'mysaloon-tryon-worker@*' 2>/dev/null || true
  systemctl disable 'mysaloon-tryon-worker@*' 2>/dev/null || true
  echo "Standalone try-on worker disabled (embedded workers in ${SVC})."
fi

systemctl restart "$SVC"
sleep 3
systemctl is-active "$SVC"
curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/
git -C "$ROOT" log -1 --oneline
