#!/usr/bin/env bash
# Isolated Hair Advisor PostgreSQL role + database (NOT production).
set -euo pipefail

DB_NAME="mysaloon_hair_staging"
ROLE_NAME="mysaloon_hair_staging"
STAGING_ROOT="/opt/mysaloon/hair-advisor-staging"
ENV_FILE="${STAGING_ROOT}/.env.hair_test"

mkdir -p "$STAGING_ROOT"
chmod 700 "$STAGING_ROOT"

exists_role="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${ROLE_NAME}'" || true)"
if [[ "$exists_role" != "1" ]]; then
  pass="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE ROLE ${ROLE_NAME} WITH LOGIN PASSWORD '${pass}' NOSUPERUSER NOCREATEDB NOCREATEROLE;
EOSQL
else
  pass=""
fi

exists_db="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" || true)"
if [[ "$exists_db" != "1" ]]; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<-EOSQL
    CREATE DATABASE ${DB_NAME} OWNER ${ROLE_NAME};
EOSQL
fi

# Prevent access to production DB (best-effort; superuser bypasses)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<-EOSQL || true
  REVOKE ALL ON DATABASE mysaloon_db FROM PUBLIC;
  REVOKE CONNECT ON DATABASE mysaloon_db FROM ${ROLE_NAME};
  REVOKE CONNECT ON DATABASE mysaloon_staging_db FROM ${ROLE_NAME};
  GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${ROLE_NAME};
EOSQL

# Allow Django test runner to create test_* database on same cluster
sudo -u postgres psql -v ON_ERROR_STOP=1 <<-EOSQL
  ALTER ROLE ${ROLE_NAME} CREATEDB;
EOSQL

if [[ ! -f "$ENV_FILE" ]] || [[ -n "$pass" ]]; then
  if [[ -z "$pass" ]]; then
    echo "WARN: role exists; keeping existing ${ENV_FILE}" >&2
    exit 0
  fi
  umask 077
  cat >"$ENV_FILE" <<EOF
# Hair Advisor isolated staging — do not use in production service
DEBUG=1
DJANGO_SETTINGS_MODULE=config.settings
SECRET_KEY=hair-staging-only-change-me
TEST_DATABASE_URL=postgres://${ROLE_NAME}:${pass}@127.0.0.1:5432/${DB_NAME}
DATABASE_URL=postgres://${ROLE_NAME}:${pass}@127.0.0.1:5432/${DB_NAME}
REDIS_URL=redis://127.0.0.1:6379/15
HAIR_ADVISOR_SYNC_AGGREGATION=1
MEDIA_ROOT=${STAGING_ROOT}/media
EOF
  chown root:root "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

mkdir -p "${STAGING_ROOT}/media"
echo "OK: ${DB_NAME} ready; env at ${ENV_FILE} (credentials not printed)"