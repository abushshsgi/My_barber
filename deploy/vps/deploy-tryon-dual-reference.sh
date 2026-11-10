#!/usr/bin/env bash
# Try-On V2: dual catalog reference + style-lock prompts on VPS backend.
# Server (root): sudo bash deploy/vps/deploy-tryon-dual-reference.sh
set -euo pipefail

ROOT="${MYSALOON_ROOT:-/var/www/mysaloon/source}"
VENV="${MYSALOON_VENV:-/var/www/mysaloon/venv}"
SVC="${MYSALOON_API_SERVICE:-mysaloon.service}"
ENV_FILE="${ROOT}/backend/.env"
BACKUP_DIR="/var/backups/mysaloon"
ROLLBACK_FILE="/var/www/mysaloon/tryon-rollback.env"

TS="$(date +%Y%m%d-%H%M%S)"
install -d "$BACKUP_DIR"

if [[ -f "$ENV_FILE" ]]; then
  cp -a "$ENV_FILE" "${BACKUP_DIR}/backend.env.${TS}"
fi

if command -v pg_dump >/dev/null 2>&1 && id postgres >/dev/null 2>&1; then
  sudo -u postgres pg_dump -Fc mybarber > "${BACKUP_DIR}/mysaloon-${TS}.dump" 2>/dev/null \
    || sudo -u postgres pg_dump -Fc mysaloon > "${BACKUP_DIR}/mysaloon-${TS}.dump" 2>/dev/null \
    || echo "pg_dump skipped (database name may differ)"
fi

cd "$ROOT"
git fetch origin
git pull --ff-only origin main
chown -R mysaloon:mysaloon "$ROOT"

_ensure_env() {
  local key="$1"
  local val="$2"
  if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
    exit 1
  fi
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

_ensure_env "RUNWARE_TRYON_DUAL_REFERENCE" "true"
_ensure_env "TRYON_PROMPT_VERSION" "v2"

cat > "$ROLLBACK_FILE" << 'EOF'
# Try-On tezkor orqaga qaytish:
# 1) Quyidagi qatorlarni /var/www/mysaloon/source/backend/.env ga qo'ying
# 2) systemctl restart mysaloon.service
# 3) systemctl try-restart mysaloon-tryon-worker.service (agar bor bo'lsa)
RUNWARE_TRYON_DUAL_REFERENCE=false
TRYON_PROMPT_VERSION=legacy
EOF
chmod 644 "$ROLLBACK_FILE"

sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py migrate --noinput"
sudo -u mysaloon bash -lc "cd ${ROOT}/backend && ${VENV}/bin/python manage.py check"

systemctl restart "$SVC"
sleep 4
systemctl is-active "$SVC"

if systemctl list-unit-files | grep -q mysaloon-tryon-worker; then
  systemctl try-restart mysaloon-tryon-worker.service || true
fi

curl -sS -o /dev/null -w 'health=%{http_code}\n' https://api.mysaloon.uz/health/
git -C "$ROOT" log -1 --oneline
grep -E '^RUNWARE_TRYON_DUAL_REFERENCE=|^TRYON_PROMPT_VERSION=' "$ENV_FILE"
echo "Rollback snippet: $ROLLBACK_FILE"
