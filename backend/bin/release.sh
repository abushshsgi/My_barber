#!/usr/bin/env bash
set -euo pipefail

echo "[release] Applying database migrations..."
python manage.py migrate --noinput -v 2

if python manage.py showmigrations --plan 2>/dev/null | grep -q '^\[ \]'; then
  echo "[release] ERROR: Unapplied migrations remain after migrate:" >&2
  python manage.py showmigrations --plan >&2 || true
  exit 1
fi

echo "[release] Collecting static files..."
python manage.py collectstatic --noinput

echo "[release] Seeding salon amenities (idempotent)..."
python manage.py seed_amenities

echo "[release] Cleaning stale mock data and service leftovers..."
python manage.py cleanup_stale_data

echo "[release] Done."
