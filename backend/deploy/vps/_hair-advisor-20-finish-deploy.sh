#!/usr/bin/env bash
set -euo pipefail
FRONT="/opt/mysaloon/Mybarber"
ROOT="/var/www/mysaloon/source"
VENV="/var/www/mysaloon/venv"
COMMIT="10e13bbf714df7f30aa60ec300ebe2c4fc28918a"

cd "$FRONT"
if [ -f deploy/vps/build.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/vps/build.env
  set +a
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

echo "=== BUILD USER ==="
npm run build:user

echo "=== DJANGO CHECK ==="
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py check"

echo "=== SERVICES ==="
install -m 644 "${ROOT}/backend/deploy/mysaloon-hair-aggregation-worker.service" /etc/systemd/system/mysaloon-hair-aggregation-worker.service
systemctl daemon-reload
chown -R www-data:www-data "${FRONT}/apps/user/dist"
systemctl restart mysaloon-user
systemctl restart mysaloon.service
sleep 5
systemctl enable --now mysaloon-hair-aggregation-worker.service || true
systemctl is-active mysaloon.service mysaloon-user mysaloon-hair-aggregation-worker.service

install -d /var/lib/mysaloon
printf '%s\n' "$COMMIT" > /var/lib/mysaloon/deployed-sha

nginx -t
systemctl reload nginx

echo "DEPLOYED_COMMIT=${COMMIT}"