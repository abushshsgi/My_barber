#!/usr/bin/env bash
set -euo pipefail
echo "=== PROD DB: hair_advisor table present? (read-only) ==="
sudo -u postgres psql -d mysaloon_db -tAc "SELECT to_regclass('public.hair_advisor_productaggregationjob');"
echo "=== STAGING DB: aggregation job rows ==="
sudo -u postgres psql -d mysaloon_hair_staging -tAc "SELECT count(*) FROM hair_advisor_productaggregationjob;"
echo "=== PROD SOURCE: hair_advisor app dir ==="
test -f /var/www/mysaloon/source/backend/hair_advisor/apps.py && echo PROD_HAS_HAIR_ADVISOR_CODE || echo PROD_NO_HAIR_ADVISOR_DIR
echo "=== PROD GIT ==="
git -C /var/www/mysaloon/source rev-parse --short HEAD