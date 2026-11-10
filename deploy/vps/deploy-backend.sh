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
systemctl restart "$SVC"
sleep 3
systemctl is-active "$SVC"
curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/
git -C "$ROOT" log -1 --oneline
