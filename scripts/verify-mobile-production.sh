#!/usr/bin/env bash
# Production tekshiruvi: web frontends + Expo mobile package
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

echo "=== MySaloon Production Verify ==="

# 1. API health
HTTP=$(curl -sS -o /tmp/mysaloon-health.json -w "%{http_code}" https://api.mysaloon.uz/health/ || echo "000")
if [[ "$HTTP" == "200" ]] && grep -q '"ok"' /tmp/mysaloon-health.json 2>/dev/null; then
  pass "API https://api.mysaloon.uz/health/ → 200"
else
  fail "API health failed (HTTP $HTTP)"
fi

# 2. User web
echo ""
echo "--- User web (MySaloon) ---"
npm run build -w user-web
[[ -f apps/user/dist/client/sw.js ]] && pass "User PWA service worker" || fail "User sw.js missing"
[[ -f apps/user/dist/client/manifest.webmanifest ]] && pass "User manifest" || fail "User manifest missing"

# 3. Barber web
echo ""
echo "--- Barber web (Partner) ---"
npm run build -w tanstack_start_ts
[[ -f apps/barber/dist/client/sw.js ]] && pass "Barber PWA service worker" || fail "Barber sw.js missing"
[[ -f apps/barber/dist/client/manifest.webmanifest ]] && pass "Barber manifest" || fail "Barber manifest missing"

# 4. Expo React Native
echo ""
echo "--- Expo mobile (apps/mobile) ---"
[[ -f apps/mobile/package.json ]] && pass "apps/mobile package.json" || fail "apps/mobile missing"
[[ -f apps/mobile/App.tsx ]] && pass "apps/mobile App.tsx" || fail "apps/mobile App.tsx missing"
grep -q '"expo"' apps/mobile/package.json && pass "Expo dependency present" || fail "Expo missing from apps/mobile"
grep -q '"react-native"' apps/mobile/package.json && pass "react-native dependency present" || fail "react-native missing"

echo ""
echo -e "${GREEN}=== Barcha tekshiruvlar o'tdi ===${NC}"
