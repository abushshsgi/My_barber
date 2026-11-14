#!/bin/bash
set -euo pipefail

echo "=== chown backend ==="
chown mysaloon:mysaloon \
  /var/www/mysaloon/source/backend/ai/services/tryon_prompts.py \
  /var/www/mysaloon/source/backend/ai/services/tryon_preserve.py \
  /var/www/mysaloon/source/backend/ai/services/runware_tryon.py \
  /var/www/mysaloon/source/backend/ai/test_runware_tryon.py \
  /var/www/mysaloon/source/backend/config/settings.py \
  /var/www/mysaloon/source/backend/.env.example \
  /var/www/mysaloon/source/backend/docs/TRYON_HAIRSTYLE_QUALITY.md

ENV=/var/www/mysaloon/source/backend/.env
if ! grep -q '^TRYON_HAIR_CHANGE_RETRY=' "$ENV"; then
  echo 'TRYON_HAIR_CHANGE_RETRY=true' >> "$ENV"
  echo "added TRYON_HAIR_CHANGE_RETRY=true"
else
  echo "TRYON_HAIR_CHANGE_RETRY already set"
fi

echo "=== restart API + try-on workers ==="
systemctl restart mysaloon.service
sleep 8
systemctl is-active mysaloon.service
curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/ || true
ps aux | grep run_tryon_worker | grep -v grep || echo "WARNING: try-on workers not running"

echo "=== build user frontend ==="
cd /opt/mysaloon/Mybarber
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
if [ -f /opt/mysaloon/Mybarber/deploy/vps/build.env ]; then
  set -a
  # shellcheck disable=SC1091
  source /opt/mysaloon/Mybarber/deploy/vps/build.env
  set +a
fi
npm run build:user
chown -R www-data:www-data /opt/mysaloon/Mybarber/apps/user/dist
systemctl restart mysaloon-user
sleep 3
systemctl is-active mysaloon-user
echo "deploy done"
