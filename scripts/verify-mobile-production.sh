#!/usr/bin/env bash
# Production mobile build tekshiruvi (user + barber PWA/Capacitor)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo "=== MySaloon Mobile Production Verify ==="

# 1. API health
HTTP=$(curl -sS -o /tmp/mysaloon-health.json -w "%{http_code}" https://api.mysaloon.uz/health/ || echo "000")
if [[ "$HTTP" == "200" ]] && grep -q '"ok"' /tmp/mysaloon-health.json 2>/dev/null; then
  pass "API https://api.mysaloon.uz/health/ → 200"
else
  fail "API health failed (HTTP $HTTP)"
fi

# 2. User build
echo ""
echo "--- User app (MySaloon) ---"
npm run build -w user-web
[[ -f apps/user/dist/client/sw.js ]] && pass "User PWA service worker" || fail "User sw.js missing"
[[ -f apps/user/dist/client/manifest.webmanifest ]] && pass "User manifest" || fail "User manifest missing"
grep -q "api.mysaloon.uz" apps/user/dist/client/assets/*.js && pass "User build has production API URL" || fail "User API URL not in bundle"

# 3. Barber build
echo ""
echo "--- Barber app (Partner) ---"
npm run build -w tanstack_start_ts
[[ -f apps/barber/dist/client/sw.js ]] && pass "Barber PWA service worker" || fail "Barber sw.js missing"
[[ -f apps/barber/dist/client/manifest.webmanifest ]] && pass "Barber manifest" || fail "Barber manifest missing"
grep -q "api.mysaloon.uz" apps/barber/dist/client/assets/*.js && pass "Barber build has production API URL" || fail "Barber API URL not in bundle"

# 4. Capacitor sync
echo ""
echo "--- Capacitor Android sync ---"
npm run cap:sync -w user-web
[[ -f apps/user/android/app/src/main/assets/public/sw.js ]] && pass "User Android assets synced" || fail "User Android sync failed"
npm run cap:sync -w tanstack_start_ts
[[ -f apps/barber/android/app/src/main/assets/public/sw.js ]] && pass "Barber Android assets synced" || fail "Barber Android sync failed"

echo ""
echo -e "${GREEN}=== Barcha tekshiruvlar o'tdi ===${NC}"
