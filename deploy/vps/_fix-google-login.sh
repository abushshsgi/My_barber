#!/usr/bin/env bash
set -euo pipefail
ROOT="/opt/mysaloon/Mybarber"
BACKEND="/var/www/mysaloon/source"
WEB_ID="$(grep '^GOOGLE_OAUTH_CLIENT_ID=' "$BACKEND/backend/.env" | cut -d= -f2- | cut -d, -f1 | tr -d ' \r')"
if [ -z "$WEB_ID" ]; then
  echo "GOOGLE_OAUTH_CLIENT_ID missing in backend .env" >&2
  exit 1
fi
install -d -m 750 "$ROOT/deploy/vps"
printf '%s\n' "VITE_GOOGLE_CLIENT_ID=${WEB_ID}" > "$ROOT/deploy/vps/build.env"
chmod 640 "$ROOT/deploy/vps/build.env"
git -C "$BACKEND" pull --ff-only origin main
bash "$BACKEND/deploy/vps/deploy-backend.sh"
git -C "$ROOT" pull --ff-only origin main
bash "$ROOT/deploy/vps/deploy-frontends.sh" user
curl -sS "https://api.mysaloon.uz/api/v1/site/config/"
echo
