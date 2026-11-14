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
  workers="${TRYON_WORKER_COUNT:-2}"
  concurrency="${TRYON_WORKER_CONCURRENCY:-3}"
  case "$workers" in
    ''|*[!0-9]*) workers=2 ;;
  esac
  case "$concurrency" in
    ''|*[!0-9]*) concurrency=4 ;;
  esac
  if [ "$workers" -lt 1 ]; then workers=1; fi
  if [ "$workers" -gt 4 ]; then workers=4; fi
  if [ "$concurrency" -lt 1 ]; then concurrency=1; fi
  if [ "$concurrency" -gt 8 ]; then concurrency=8; fi
  provider_slots="${TRYON_PROVIDER_CONCURRENCY:-4}"
  provider_cap="${TRYON_PROVIDER_CONCURRENCY_CAP:-4}"
  case "$provider_cap" in
    ''|*[!0-9]*) provider_cap=4 ;;
  esac
  if [ "$provider_cap" -lt 1 ]; then provider_cap=1; fi
  if [ "$provider_cap" -gt 16 ]; then provider_cap=16; fi
  case "$provider_slots" in
    ''|*[!0-9]*) provider_slots=4 ;;
  esac
  if [ "$provider_slots" -gt "$provider_cap" ]; then
    provider_slots="$provider_cap"
  fi
  if [ "$provider_slots" -lt 1 ]; then provider_slots=1; fi
  max_total_threads="$provider_slots"
  total_threads=$((workers * concurrency))
  if [ "$total_threads" -gt "$max_total_threads" ]; then
    new_concurrency=$((max_total_threads / workers))
    if [ "$new_concurrency" -lt 1 ]; then new_concurrency=1; fi
    echo "[start] Try-on threads clamped: ${workers}x${concurrency} -> ${workers}x${new_concurrency} (Runware slots=${provider_slots})" >&2
    concurrency="$new_concurrency"
  fi
  echo "[start] Starting ${workers} try-on workers x ${concurrency} threads (global provider slots=${provider_slots})..."
  i=1
  while [ "$i" -le "$workers" ]; do
    python manage.py run_tryon_worker --poll-seconds 5 --concurrency "${concurrency}" &
    i=$((i + 1))
  done
fi

echo "[start] Syncing exchange rates (if stale)..."
python manage.py sync_exchange_rates --if-stale

echo "[start] Starting ASGI server..."
exec daphne -b 127.0.0.1 -p "${PORT:?PORT is required}" config.asgi:application
