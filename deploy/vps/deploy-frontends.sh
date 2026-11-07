#!/usr/bin/env bash
# VPS da frontendlarni yangilaydi. api.mysaloon.uz Railway da qoladi.
# Ishlatish (serverda): sudo bash deploy/vps/deploy-frontends.sh [auto|all|user|admin|barber]
set -euo pipefail

ROOT=/opt/mysaloon/Mybarber
STATE=/var/lib/mysaloon/deployed-sha
TARGET="${1:-auto}"
cd "$ROOT"

OLD=""
if [ -f "$STATE" ]; then
  OLD="$(cat "$STATE")"
fi
git pull --ff-only
NEW="$(git rev-parse HEAD)"

if [ -z "$OLD" ] || [ "$OLD" = "$NEW" ]; then
  FILES="$(git diff-tree --no-commit-id --name-only -r HEAD)"
else
  FILES="$(git diff --name-only "$OLD" "$NEW")"
fi

need_user=0
need_admin=0
need_barber=0
if [ "$TARGET" = "auto" ] && [ -z "$OLD" ]; then
  TARGET=all
fi
case "$TARGET" in
  all) need_user=1; need_admin=1; need_barber=1 ;;
  user) need_user=1 ;;
  admin) need_admin=1 ;;
  barber) need_barber=1 ;;
  auto)
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      case "$file" in
        apps/user/*|packages/*|package-lock.json|package.json) need_user=1 ;;
      esac
      case "$file" in
        apps/admin/*|packages/*|package-lock.json|package.json) need_admin=1 ;;
      esac
      case "$file" in
        apps/barber/*|packages/*|package-lock.json|package.json) need_barber=1 ;;
      esac
    done <<< "$FILES"
    ;;
  *)
    echo "Noma'lum nishon: $TARGET (auto|all|user|admin|barber)" >&2
    exit 1
    ;;
esac

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"

if [ -f "$ROOT/deploy/vps/build.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/deploy/vps/build.env"
  set +a
fi

if printf '%s\n' "$FILES" | grep -q '^package-lock.json$'; then
  npm ci
fi

if [ "$need_user" = 1 ]; then
  npm run build:user
fi
if [ "$need_admin" = 1 ]; then
  npm run build:admin
fi
if [ "$need_barber" = 1 ]; then
  npm run build:barber
fi

install -d /var/www/certbot
install -m 644 "$ROOT/deploy/vps/nginx/mysaloon-user.conf" /etc/nginx/sites-available/mysaloon-user.conf
install -m 644 "$ROOT/deploy/vps/nginx/mysaloon-admin.conf" /etc/nginx/sites-available/mysaloon-admin.conf
install -m 644 "$ROOT/deploy/vps/nginx/mysaloon-barber.conf" /etc/nginx/sites-available/mysaloon-barber.conf
ln -sfn /etc/nginx/sites-available/mysaloon-user.conf /etc/nginx/sites-enabled/mysaloon-user.conf
ln -sfn /etc/nginx/sites-available/mysaloon-admin.conf /etc/nginx/sites-enabled/mysaloon-admin.conf
ln -sfn /etc/nginx/sites-available/mysaloon-barber.conf /etc/nginx/sites-enabled/mysaloon-barber.conf
rm -f /etc/nginx/sites-enabled/default

install -m 644 "$ROOT/deploy/vps/mysaloon-user.service" /etc/systemd/system/mysaloon-user.service
systemctl daemon-reload
systemctl enable mysaloon-user
if [ "$need_user" = 1 ]; then
  chown -R www-data:www-data "$ROOT/apps/user/dist"
  systemctl restart mysaloon-user
fi

nginx -t
systemctl reload nginx

install -d /var/lib/mysaloon
printf '%s\n' "$NEW" > "$STATE"

echo "Frontendlar yangilandi (user=$need_user admin=$need_admin barber=$need_barber)."
echo "HTTPS yo'q bo'lsa: certbot --nginx -d www.mysaloon.uz -d mysaloon.uz -d admin.mysaloon.uz -d partner.mysaloon.uz"
