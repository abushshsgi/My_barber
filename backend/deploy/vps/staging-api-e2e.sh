#!/usr/bin/env bash
# Staging API on isolated DB + HTTP smoke (no nginx changes).
set -euo pipefail
STAGING_ROOT="/opt/mysaloon/hair-advisor-staging"
set -a
# shellcheck disable=SC1090
source "${STAGING_ROOT}/.env.hair_test"
set +a
export MEDIA_ROOT="${STAGING_ROOT}/media"
cd "${STAGING_ROOT}/backend"
PY=/var/www/mysaloon/venv/bin/python
PORT=18081
PIDFILE="${STAGING_ROOT}/staging-api.pid"
LOG="${STAGING_ROOT}/staging-api.log"

stop_api() {
  if [[ -f "$PIDFILE" ]]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
}
trap stop_api EXIT

stop_api
nohup "$PY" manage.py runserver "127.0.0.1:${PORT}" >"$LOG" 2>&1 &
echo $! >"$PIDFILE"
sleep 5

echo "=== STAGING HTTP ==="
curl -sS -o /dev/null -w "health=%{http_code}\n" "http://127.0.0.1:${PORT}/health/" || true
curl -sS -o /dev/null -w "hair_api=%{http_code}\n" -X POST "http://127.0.0.1:${PORT}/api/v1/hair-advisor/scans/" \
  -H "Content-Type: application/json" -d '{}' || true

echo "=== E2E BACKEND (PostgreSQL) ==="
"$PY" manage.py test hair_advisor.tests.test_e2e_scenarios -v1

echo "=== STAGING OK ==="