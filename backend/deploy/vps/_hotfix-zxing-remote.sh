#!/usr/bin/env bash
set -euo pipefail
FRONT="/opt/mysaloon/Mybarber"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/var/backups/mysaloon/user-dist_${STAMP}.tar.gz"

mkdir -p /var/backups/mysaloon
tar -czf "$BACKUP" -C "$FRONT/apps/user" dist
echo "BACKUP=$BACKUP"

cd "$FRONT"
tar -xzf /tmp/hotfix-zxing.tar.gz
if [ -f deploy/vps/build.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/vps/build.env
  set +a
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
npm ci
npm run build:user
test -f apps/user/dist/client/version.json
chown -R www-data:www-data apps/user/dist
systemctl restart mysaloon-user
curl -sS http://127.0.0.1:3000/version.json
echo ""
curl -sS http://127.0.0.1:3000/ai-style/care/ingredient 2>&1 | tr '<' '\n' | grep -E 'data-morph-lcp|if\(p===' | head -3
echo "DEPLOY_STAMP=$STAMP"