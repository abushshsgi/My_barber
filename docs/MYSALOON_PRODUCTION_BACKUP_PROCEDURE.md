# MySaloon — production backup & recovery procedure

**Status:** Documented for owner-approved execution. **Not run** during the hybrid SSR branch.  
**Production baseline:** `3caad448` (stable).  
**Gap closed:** pre-release script now records full migration list and optional full DB flag.

---

## Scope

| Asset | RTO target | Method |
| --- | --- | --- |
| Frontend `dist/` | Minutes | `user-dist.tar.gz` (existing) |
| Git release SHA | Minutes | `frontend-git-sha.txt`, `backend-git-sha.txt`, `deployed-sha` |
| `content_seo` rows | Hours | `content_seo_dumpdata.json` (partial app data) |
| **Full PostgreSQL** | Hours | `pg_dump -Fc` or provider snapshot (**required before risky migrations**) |
| Uploaded media | Hours | Volume snapshot or `StoredMedia` provider backup |
| Roles / grants | Hours | `pg_dumpall --roles-only` on same cadence as full DB |

---

## Authorization

1. Owner explicitly approves **production backup window** (no deploy overlap).
2. Operator sets on VPS only: `export MYSALOON_FULL_DB_BACKUP=1` before `deploy/vps/pre-release-backup.sh`.
3. **Do not** download production dumps to unsecured workstations.
4. **Do not** restore over production without a written runbook and second operator review.

---

## Pre-release script (authorized host)

Path: `deploy/vps/pre-release-backup.sh`

Always captures:

- `user-dist.tar.gz`
- Git SHAs, `version.json`, `deployed-sha`
- `content_seo_dumpdata.json` + `content_seo_migrations.txt`
- `django_showmigrations.txt`
- `media-manifest-head.txt` (first 5k paths under `/var/www/mysaloon/media` when present)

When `MYSALOON_FULL_DB_BACKUP=1`:

- Runs `/var/www/mysaloon/bin/pg-backup-once.sh "$BK"` if installed, else writes `FULL_DB_BACKUP_PENDING.txt`.

---

## Full PostgreSQL (operator runbook on VPS)

Store connection variables in **`/etc/mysaloon/pg-backup.env`** (mode `600`, owner `root:www-data` or deploy user only). **Never commit** this file.

Example `pg-backup-once.sh` (install to `/var/www/mysaloon/bin/`):

```bash
#!/usr/bin/env bash
set -eu
BK="${1:?backup directory}"
set -a
# shellcheck disable=SC1091
source /etc/mysaloon/pg-backup.env
set +a
umask 077
pg_dump -Fc -f "$BK/postgres-full.dump" "$DATABASE_URL"
sha256sum "$BK/postgres-full.dump" > "$BK/postgres-full.dump.sha256"
pg_dumpall --roles-only -f "$BK/postgres-roles.sql"
```

Integrity:

```bash
sha256sum -c "$BK/postgres-full.dump.sha256"
pg_restore -l "$BK/postgres-full.dump" | head
```

Retention (recommended):

| Tier | Location | Retention |
| --- | --- | --- |
| Release | `/var/lib/mysaloon/backups/release-*` | 30 days |
| Daily full DB | Object storage (encrypted) | 90 days |
| Provider snapshot | Neon / host panel | Per vendor policy |

---

## Media strategy

Production uses **Postgres `StoredMedia`** and/or disk volume (`backend/config/settings.py`).  

- **No schema change** in hybrid SSR branch.  
- Back up **database bytes** with full `pg_dump`.  
- Optional: weekly `rsync` or volume snapshot for `/var/www/mysaloon/media` if legacy disk files remain.

---

## Recovery (isolated only)

1. Provision **empty** staging DB and app stack (not production).
2. `pg_restore --clean --if-exists -d "$STAGING_DATABASE_URL" postgres-full.dump`
3. Restore frontend: `tar -xzf user-dist.tar.gz -C .../apps/user`
4. `git checkout` recorded SHA on backend; **do not** auto-roll back migrations on production.
5. Smoke: `/health/`, `/api/v1/hairstyles/` count **62**, `/explore` **200**.

---

## Migration state

Record before/after every release:

```bash
cd /var/www/mysaloon/source/backend
python manage.py showmigrations > showmigrations.txt
```

Production reference (2026-11-28): `content_seo` **0001–0005** applied.

---

## Access control

- Backup directory: `/var/lib/mysaloon/backups/` — `root:mysaloon`, `750`.
- Off-site copies: SSE-KMS or equivalent; no public buckets.
- Audit: log operator UNIX user + timestamp in `BACKUP_DIR` readme.