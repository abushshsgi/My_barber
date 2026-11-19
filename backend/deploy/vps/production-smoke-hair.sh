#!/usr/bin/env bash
set -euo pipefail
echo "=== HTTP ==="
curl -sS -o /dev/null -w 'api_health=%{http_code}\n' https://api.mysaloon.uz/health/
curl -sS -o /dev/null -w 'user_www=%{http_code}\n' https://mysaloon.uz/
curl -sS -o /dev/null -w 'admin=%{http_code}\n' https://admin.mysaloon.uz/
curl -sS -o /dev/null -w 'tryon_route=%{http_code}\n' -L "https://mysaloon.uz/ai-style" || true
curl -sS -o /dev/null -w 'hair_ingredient=%{http_code}\n' -L "https://mysaloon.uz/ai-style/care/ingredient" || true

echo "=== HAIR ADVISOR API (unauthenticated expect 401) ==="
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "https://api.mysaloon.uz/api/v1/hair-advisor/scans/" -H "Content-Type: application/json" -d '{}')
echo "hair_scan_post=${code}"

echo "=== DB TABLE ==="
sudo -u postgres psql -d mysaloon_db -tAc "SELECT to_regclass('public.hair_advisor_productaggregationjob');"

echo "=== WORKER LOG (last 5) ==="
journalctl -u mysaloon-hair-aggregation-worker.service -n 5 --no-pager 2>/dev/null || true