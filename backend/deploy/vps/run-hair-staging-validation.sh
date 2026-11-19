#!/usr/bin/env bash
# Run Hair Advisor validation against isolated DB only.
set -euo pipefail

STAGING_ROOT="/opt/mysaloon/hair-advisor-staging"
ENV_FILE="${STAGING_ROOT}/.env.hair_test"
BACKEND="${STAGING_ROOT}/backend"
VENV="/var/www/mysaloon/venv/bin/python"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

export MEDIA_ROOT="${STAGING_ROOT}/media"
mkdir -p "$MEDIA_ROOT"

cd "$BACKEND"

echo "=== TARGET DB (name only) ==="
"$VENV" -c "import os; from urllib.parse import urlparse; u=urlparse(os.environ['TEST_DATABASE_URL']); print(u.hostname, u.path.strip('/'))"

echo "=== DJANGO CHECK ==="
"$VENV" manage.py check

echo "=== MIGRATE (staging only) ==="
"$VENV" manage.py migrate --noinput

echo "=== HAIR_ADVISOR MIGRATIONS ==="
"$VENV" manage.py showmigrations hair_advisor

echo "=== TESTS (PostgreSQL via TEST_DATABASE_URL) ==="
unset MYSALOON_FORCE_SQLITE_TESTS
"$VENV" manage.py test hair_advisor -v1 2>&1 | tee "${STAGING_ROOT}/test-hair_advisor.log"
exit "${PIPESTATUS[0]}"