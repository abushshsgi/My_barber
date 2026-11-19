#!/usr/bin/env bash
# User web only — overlay from origin/main without git pull (dirty tree safe).
set -euo pipefail
FRONT="/opt/mysaloon/Mybarber"
STATE="/var/lib/mysaloon/deployed-sha"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="/var/backups/mysaloon/user-dist_${STAMP}_pre-deploy.tar.gz"
ROLLBACK_MARKER="/var/backups/mysaloon/user-dist_rollback_${STAMP}.txt"
WORKDIR="/tmp/mysaloon-user-release-${STAMP}"

DEPLOY_COMMIT="${DEPLOY_COMMIT:-}"
PRE_BUILD_ID=""
if [ -f "$FRONT/apps/user/dist/client/version.json" ]; then
  PRE_BUILD_ID="$(sed -n 's/.*"buildId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$FRONT/apps/user/dist/client/version.json" | head -1)"
fi

rollback() {
  echo "ROLLBACK: restoring dist from $BACKUP"
  systemctl stop mysaloon-user || true
  rm -rf "$FRONT/apps/user/dist"
  tar -xzf "$BACKUP" -C "$FRONT/apps/user"
  chown -R www-data:www-data "$FRONT/apps/user/dist"
  systemctl start mysaloon-user
  echo "ROLLBACK_DONE pre_buildId=${PRE_BUILD_ID}"
}
trap 'if [ $? -ne 0 ]; then rollback; fi' ERR

mkdir -p /var/backups/mysaloon "$WORKDIR"
tar -czf "$BACKUP" -C "$FRONT/apps/user" dist
echo "$BACKUP" > "$ROLLBACK_MARKER"
echo "BACKUP=$BACKUP pre_buildId=${PRE_BUILD_ID:-unknown}"

cd "$FRONT"
git fetch origin main
NEW="$(git rev-parse origin/main)"
if [ -n "$DEPLOY_COMMIT" ]; then
  NEW="$(git rev-parse "$DEPLOY_COMMIT")"
fi
echo "TARGET_COMMIT=$NEW"

git archive "$NEW" | tar -x -C "$WORKDIR"
rsync -a "$WORKDIR/apps/user/" "$FRONT/apps/user/"
install -m 644 "$WORKDIR/package.json" "$FRONT/package.json"
install -m 644 "$WORKDIR/package-lock.json" "$FRONT/package-lock.json"
if [ -f "$WORKDIR/deploy/vps/deploy-frontends.sh" ]; then
  install -m 644 "$WORKDIR/deploy/vps/deploy-frontends.sh" "$FRONT/deploy/vps/deploy-frontends.sh"
fi

if [ -f "$FRONT/deploy/vps/build.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$FRONT/deploy/vps/build.env"
  set +a
fi
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

cd "$FRONT"
npm ci
rm -rf apps/user/dist
export GITHUB_SHA="$NEW"
npm run build:user
test -f apps/user/dist/client/version.json

POST_BUILD_ID="$(sed -n 's/.*"buildId"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' apps/user/dist/client/version.json | head -1)"
echo "POST_BUILD_ID=$POST_BUILD_ID"

# ZXing chunk present
if ! grep -rl 'zxing' apps/user/dist/client/assets/*.js 2>/dev/null | head -1 | grep -q .; then
  if ! grep -rl 'BrowserMultiFormatReader' apps/user/dist/client/assets/*.js 2>/dev/null | head -1 | grep -q .; then
    echo "FATAL: ZXing not found in client bundle" >&2
    exit 1
  fi
fi

chown -R www-data:www-data apps/user/dist
systemctl restart mysaloon-user
sleep 2
systemctl is-active mysaloon-user

VER_CODE="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/version.json)"
if [ "$VER_CODE" != "200" ]; then
  echo "FATAL: version.json HTTP $VER_CODE" >&2
  exit 1
fi
curl -sS http://127.0.0.1:3000/version.json
echo ""

HA_HTML="$(curl -sS http://127.0.0.1:3000/ai-style/care/ingredient)"
if echo "$HA_HTML" | grep -q 'p==="/ai-style"){document.documentElement.setAttribute("data-morph-lcp"'; then
  if ! echo "$HA_HTML" | grep -q 'else{document.documentElement.removeAttribute("data-morph-lcp")'; then
    echo "FATAL: morph LCP boot script missing else branch" >&2
    exit 1
  fi
fi
if echo "$HA_HTML" | grep -q 'if(p==="/"||p==="/ai-style"||p.indexOf("/ai-style/")===0)'; then
  echo "FATAL: old broad morph LCP script still present" >&2
  exit 1
fi

HOME_CODE="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)"
AI_CODE="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/ai-style)"
if [ "$HOME_CODE" != "200" ] || [ "$AI_CODE" != "200" ]; then
  echo "FATAL: home=$HOME_CODE ai-style=$AI_CODE" >&2
  exit 1
fi

if [ -x "$FRONT/backend/deploy/vps/production-smoke-hair.sh" ]; then
  bash "$FRONT/backend/deploy/vps/production-smoke-hair.sh" || true
elif [ -f /var/www/mysaloon/source/backend/deploy/vps/production-smoke-hair.sh ]; then
  bash /var/www/mysaloon/source/backend/deploy/vps/production-smoke-hair.sh || true
fi

journalctl -u mysaloon-user -n 15 --no-pager | tail -8

printf '%s\n' "$NEW" > "$STATE"
echo "DEPLOYED_SHA=$NEW buildId=$POST_BUILD_ID STAMP=$STAMP"
echo "PRE_BUILD_ID=${PRE_BUILD_ID} preserved_at=$BACKUP"