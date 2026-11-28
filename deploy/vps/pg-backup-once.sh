#!/usr/bin/env bash
# Full PostgreSQL backup into a release directory. Install on VPS only — not executed from CI.
# Requires /etc/mysaloon/pg-backup.env (DATABASE_URL, optional PG* vars). chmod 600.
set -eu
BK="${1:?backup directory}"
ENV_FILE="${MYSALOON_PG_BACKUP_ENV:-/etc/mysaloon/pg-backup.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "missing $ENV_FILE — create per docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
umask 077
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found" >&2
  exit 1
fi
pg_dump -Fc -f "$BK/postgres-full.dump" "$DATABASE_URL"
sha256sum "$BK/postgres-full.dump" > "$BK/postgres-full.dump.sha256"
if command -v pg_dumpall >/dev/null 2>&1; then
  pg_dumpall --roles-only -f "$BK/postgres-roles.sql"
fi
echo "OK postgres-full.dump"