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
du -sh "$BK/user-dist.tar.gz"
ls -la "$BK"
echo "BACKUP_DIR=$BK"