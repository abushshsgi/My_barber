#!/usr/bin/env bash
set -euo pipefail

echo "[release] Applying database migrations..."
python manage.py migrate --noinput -v 1

echo "[release] Collecting static files..."
python manage.py collectstatic --noinput

echo "[release] Seeding salon amenities (idempotent)..."
python manage.py seed_amenities

echo "[release] Cleaning stale mock data and service leftovers..."
python manage.py cleanup_stale_data

echo "[release] Done."
