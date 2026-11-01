#!/usr/bin/env bash
set -euo pipefail

echo "[start] Running database migrations..."
python manage.py migrate --noinput -v 1

echo "[start] Ensuring booking check-in columns..."
python manage.py ensure_booking_checkin_schema

if python manage.py showmigrations --plan 2>/dev/null | grep -q '^\[ \]'; then
  echo "[start] ERROR: Unapplied migrations remain after migrate:" >&2
  python manage.py showmigrations --plan >&2 || true
  exit 1
fi

if [ -n "${REDIS_URL:-}" ] && [ "${TRYON_QUEUE_ENABLED:-true}" != "false" ]; then
  workers="${TRYON_WORKER_COUNT:-8}"
  case "$workers" in
    ''|*[!0-9]*) workers=8 ;;
  esac
  if [ "$workers" -lt 1 ]; then workers=1; fi
  if [ "$workers" -gt 16 ]; then workers=16; fi
  echo "[start] Starting ${workers} try-on Redis workers..."
  i=1
  while [ "$i" -le "$workers" ]; do
    python manage.py run_tryon_worker --poll-seconds 5 &
    i=$((i + 1))
  done
fi

echo "[start] Syncing exchange rates (if stale)..."
python manage.py sync_exchange_rates --if-stale

echo "[start] Starting ASGI server..."
exec daphne -b 0.0.0.0 -p "${PORT:?PORT is required}" config.asgi:application
