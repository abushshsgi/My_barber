#!/usr/bin/env bash
# VPS: frontend (mysaloon-user) + backend (mysaloon.service). Railway emas.
# Ishlatish: sudo bash deploy/vps/deploy-all.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Backend (Django API) ==="
if [ -x "$SCRIPT_DIR/deploy-backend.sh" ]; then
  bash "$SCRIPT_DIR/deploy-backend.sh"
else
  echo "deploy-backend.sh topilmadi" >&2
  exit 1
fi

echo "=== Frontends (user / admin / barber) ==="
FRONT_ROOT="${MYSALOON_FRONT_ROOT:-/opt/mysaloon/Mybarber}"
if [ -d "$FRONT_ROOT/deploy/vps" ]; then
  bash "$FRONT_ROOT/deploy/vps/deploy-frontends.sh" all
elif [ -f "$SCRIPT_DIR/deploy-frontends.sh" ]; then
  bash "$SCRIPT_DIR/deploy-frontends.sh" all
else
  echo "Frontend repo topilmadi: $FRONT_ROOT" >&2
  exit 1
fi

echo "VPS deploy tugadi (backend + frontends)."
