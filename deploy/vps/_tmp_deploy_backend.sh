#!/bin/bash
set -euo pipefail
cd /var/www/mysaloon/source
git fetch origin
git pull --ff-only origin main
chown -R mysaloon:mysaloon /var/www/mysaloon/source
sudo -u mysaloon bash -lc 'cd /var/www/mysaloon/source/backend && /var/www/mysaloon/venv/bin/python manage.py migrate --noinput'
systemctl restart mysaloon.service
sleep 4
systemctl is-active mysaloon.service
curl -sS -o /tmp/health.out -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/
git -C /var/www/mysaloon/source log -1 --oneline
if grep -n "seedImage\|TRYON_STRENGTH" /var/www/mysaloon/source/backend/ai/services/runware_tryon.py; then
  echo "seedImage still present" >&2
  exit 1
fi
grep -n "referenceImages" /var/www/mysaloon/source/backend/ai/services/runware_tryon.py | head
systemctl list-units --type=service --all | grep -i tryon || true
