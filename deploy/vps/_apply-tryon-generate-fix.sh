#!/bin/bash
set -euo pipefail
SRC=/tmp/tryon-fix
install -m 644 -o mysaloon -g mysaloon "$SRC/tryon_preserve.py" /var/www/mysaloon/source/backend/ai/services/tryon_preserve.py
install -m 644 -o mysaloon -g mysaloon "$SRC/runware_tryon.py" /var/www/mysaloon/source/backend/ai/services/runware_tryon.py
install -m 644 -o mysaloon -g mysaloon "$SRC/test_runware_tryon.py" /var/www/mysaloon/source/backend/ai/test_runware_tryon.py
install -m 644 "$SRC/tryon_preserve.py" /opt/mysaloon/Mybarber/backend/ai/services/tryon_preserve.py
install -m 644 "$SRC/runware_tryon.py" /opt/mysaloon/Mybarber/backend/ai/services/runware_tryon.py
install -m 644 "$SRC/test_runware_tryon.py" /opt/mysaloon/Mybarber/backend/ai/test_runware_tryon.py
install -m 644 "$SRC/AiStyleResultsPage.tsx" /opt/mysaloon/Mybarber/apps/user/src/components/ai-style/AiStyleResultsPage.tsx
install -m 644 "$SRC/useAiStyleFlow.ts" /opt/mysaloon/Mybarber/apps/user/src/components/ai-style/useAiStyleFlow.ts
if [ -d /var/www/mysaloon/source/apps/user/src/components/ai-style ]; then
  install -m 644 "$SRC/AiStyleResultsPage.tsx" /var/www/mysaloon/source/apps/user/src/components/ai-style/AiStyleResultsPage.tsx
  install -m 644 "$SRC/useAiStyleFlow.ts" /var/www/mysaloon/source/apps/user/src/components/ai-style/useAiStyleFlow.ts
fi
ENV=/var/www/mysaloon/source/backend/.env
if grep -q '^RUNWARE_TRYON_TIMEOUT=' "$ENV"; then
  sed -i 's/^RUNWARE_TRYON_TIMEOUT=.*/RUNWARE_TRYON_TIMEOUT=180/' "$ENV"
else
  echo 'RUNWARE_TRYON_TIMEOUT=180' >> "$ENV"
fi
echo "=== env ==="
grep -E '^(RUNWARE_TRYON_TIMEOUT|RUNWARE_TRYON_MODEL|TRYON_SCENE_LOCK)=' "$ENV" || true
echo "=== restart API ==="
systemctl restart mysaloon.service
sleep 8
systemctl is-active mysaloon.service
curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/ || true
ps aux | grep run_tryon_worker | grep -v grep | wc -l
echo "=== tests ==="
sudo -u mysaloon bash -lc 'cd /var/www/mysaloon/source/backend && /var/www/mysaloon/venv/bin/python manage.py test ai.test_runware_tryon.RunwareTryOnTests.test_scene_lock_keeps_generated_fringe_on_forehead_skin ai.test_runware_tryon.RunwareTryOnTests.test_rate_limit_does_not_switch_to_reserve_in_the_same_job -v 1'
echo "=== frontend build ==="
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
