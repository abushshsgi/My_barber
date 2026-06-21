#!/usr/bin/env bash
set -euo pipefail

echo "[release] Applying database migrations..."
python manage.py migrate --noinput -v 1

echo "[release] Collecting static files..."
python manage.py collectstatic --noinput

echo "[release] Seeding salon amenities (idempotent)..."
python manage.py seed_amenities

echo "[release] Done."
