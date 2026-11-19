#!/usr/bin/env bash
set -euo pipefail
STAGING_ROOT="/opt/mysaloon/hair-advisor-staging"
set -a
# shellcheck disable=SC1090
source "${STAGING_ROOT}/.env.hair_test"
set +a
export MEDIA_ROOT="${STAGING_ROOT}/media"
cd "${STAGING_ROOT}/backend"
PY=/var/www/mysaloon/venv/bin/python

echo "=== ISOLATION: staging role cannot reach prod DB ==="
if "$PY" -c "
import os, psycopg2
from urllib.parse import urlparse
u=urlparse(os.environ['TEST_DATABASE_URL'])
psycopg2.connect(host=u.hostname,user=u.username,password=u.password,dbname='mysaloon_db')
" 2>/dev/null; then
  echo "UNEXPECTED_CONNECT"
  exit 1
else
  echo "DENIED_AS_EXPECTED"
fi

echo "=== REDIS PING (db 15) ==="
redis-cli -n 15 PING

echo "=== WORKER SMOKE (15s) ==="
timeout 15 "$PY" manage.py run_aggregation_worker --poll-seconds 2 --limit 3 2>&1 | tail -5 || echo "WORKER_TIMEOUT_OK"

echo "=== GEMINI IN STAGING ENV ==="
if grep -qE '^GEMINI|GOOGLE_AI' "${STAGING_ROOT}/.env.hair_test" 2>/dev/null; then echo CONFIGURED; else echo NOT_IN_STAGING_ENV; fi

echo "=== PRODUCTION SERVICE UNTOUCHED ==="
systemctl is-active mysaloon.service