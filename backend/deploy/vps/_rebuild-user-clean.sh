#!/usr/bin/env bash
set -euo pipefail
FRONT="/opt/mysaloon/Mybarber"
NEW="${1:-$(cd "$FRONT" && git rev-parse origin/main)}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/var/backups/mysaloon/user-dist_${STAMP}_pre-clean-rebuild.tar.gz"

tar -czf "$BACKUP" -C "$FRONT/apps/user" dist
echo "BACKUP=$BACKUP"

cd "$FRONT"
if [ -f deploy/vps/build.env ]; then
  set -a
  # shellcheck disable=SC1091
  source deploy/vps/build.env
  set +a
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
export GITHUB_SHA="$NEW"
rm -rf apps/user/dist
npm run build:user
test -f apps/user/dist/client/version.json
chown -R www-data:www-data apps/user/dist
systemctl restart mysaloon-user
sleep 2
curl -sS http://127.0.0.1:3000/version.json
echo ""
ls apps/user/dist/client/assets/index-*.js | wc -l