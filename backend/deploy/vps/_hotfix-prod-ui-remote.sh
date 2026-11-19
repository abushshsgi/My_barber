#!/usr/bin/env bash
set -euo pipefail
FRONT="/opt/mysaloon/Mybarber"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/var/backups/mysaloon/user-dist_${STAMP}.tar.gz"

mkdir -p /var/backups/mysaloon
if [ -d "$FRONT/apps/user/dist" ]; then
  tar -czf "$BACKUP" -C "$FRONT/apps/user" dist
  echo "BACKUP=$BACKUP"
fi

cd "$FRONT"
tar -xzf /tmp/hotfix-prod-ui.tar.gz

if [ -f deploy/vps/build.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/vps/build.env
  set +a
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

npm run build:user
test -f apps/user/dist/client/version.json

chown -R www-data:www-data apps/user/dist
systemctl restart mysaloon-user
sleep 2
systemctl is-active mysaloon-user

curl -sS -o /dev/null -w 'version_http=%{http_code}\n' http://127.0.0.1:3000/version.json
curl -sS http://127.0.0.1:3000/version.json
echo ""

echo "=== morph-lcp boot (ingredient route) ==="
curl -sS http://127.0.0.1:3000/ai-style/care/ingredient | tr '<' '\n' | grep -E 'morph-lcp|MORPH' | head -5 || true

echo "HOTFIX_DONE=${STAMP}"