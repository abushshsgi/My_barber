#!/usr/bin/env bash
set -euo pipefail

echo "[start] Running database migrations..."
python manage.py migrate --noinput

echo "[start] Syncing exchange rates (if stale)..."
python manage.py sync_exchange_rates --if-stale

echo "[start] Starting ASGI server..."
exec daphne -b 0.0.0.0 -p "${PORT:?PORT is required}" config.asgi:application
