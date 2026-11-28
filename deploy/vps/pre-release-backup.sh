#!/usr/bin/env bash
# One-shot production backup before unified release. No secrets printed.
set -eu
TS=$(date +%Y%m%d-%H%M%S)
BK="/var/lib/mysaloon/backups/release-${TS}"
mkdir -p "$BK"
echo "$BK" > /tmp/mysaloon_last_backup_path.txt
cp -a /var/lib/mysaloon/deployed-sha "$BK/" 2>/dev/null || true
git -C /opt/mysaloon/Mybarber rev-parse HEAD > "$BK/frontend-git-sha.txt"
git -C /var/www/mysaloon/source rev-parse HEAD > "$BK/backend-git-sha.txt"
cp /opt/mysaloon/Mybarber/apps/user/dist/client/version.json "$BK/version.json" 2>/dev/null || true
tar -czf "$BK/user-dist.tar.gz" -C /opt/mysaloon/Mybarber/apps/user dist
cd /var/www/mysaloon/source/backend
/var/www/mysaloon/venv/bin/python manage.py showmigrations content_seo > "$BK/content_seo_migrations.txt"
/var/www/mysaloon/venv/bin/python manage.py dumpdata content_seo > "$BK/content_seo_dumpdata.json"
/var/www/mysaloon/venv/bin/python manage.py showmigrations > "$BK/django_showmigrations.txt" 2>/dev/null || true

# To'liq PostgreSQL — faqat egasi MYSALOON_FULL_DB_BACKUP=1 qo'yganida.
# Aniq pg_dump buyruqlari: docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md (maxfiy env fayl, parol chiqarilmaydi).
if [ "${MYSALOON_FULL_DB_BACKUP:-0}" = "1" ]; then
  if [ -x /var/www/mysaloon/bin/pg-backup-once.sh ]; then
    /var/www/mysaloon/bin/pg-backup-once.sh "$BK"
  else
    echo "owner-approved full DB backup requested at $(date -Iseconds)" >"$BK/FULL_DB_BACKUP_PENDING.txt"
    echo "Run pg-backup-once.sh or provider snapshot — see docs/MYSALOON_PRODUCTION_BACKUP_PROCEDURE.md" >>"$BK/FULL_DB_BACKUP_PENDING.txt"
  fi
fi

# Media: faqat manifest (baytlarni alohida snapshot qiling — StoredMedia / volume).
if [ -d /var/www/mysaloon/media ]; then
  (cd /var/www/mysaloon/media && find . -type f 2>/dev/null | head -n 5000) > "$BK/media-manifest-head.txt" || true
fi

du -sh "$BK/user-dist.tar.gz" 2>/dev/null || true
ls -la "$BK"
echo "BACKUP_DIR=$BK"