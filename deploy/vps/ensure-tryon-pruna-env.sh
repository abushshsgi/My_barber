#!/usr/bin/env bash
# Production .env: Pruna Try-On defaults (secrets ga tegmaydi).
set -euo pipefail
ENV="${MYSALOON_ENV:-/var/www/mysaloon/source/backend/.env}"
if [ ! -f "$ENV" ]; then
  echo "Missing $ENV" >&2
  exit 1
fi
_ensure_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >>"$ENV"
  fi
}
_ensure_env "RUNWARE_TRYON_MODEL" "prunaai:2@1"
_ensure_env "RUNWARE_TRYON_FALLBACK_MODELS" ""
_ensure_env "RUNWARE_TRYON_WIDTH" "768"
_ensure_env "RUNWARE_TRYON_HEIGHT" "1024"
_ensure_env "RUNWARE_TRYON_TIMEOUT" "120"
_ensure_env "RUNWARE_TRYON_MAX_COST_USD" "0.012"
_ensure_env "TRYON_PROMPT_VERSION" "pruna"
_ensure_env "RUNWARE_TRYON_OUTPUT_FORMAT" "JPG"
grep -E '^(RUNWARE_TRYON_MODEL|TRYON_PROMPT_VERSION)=' "$ENV" || true