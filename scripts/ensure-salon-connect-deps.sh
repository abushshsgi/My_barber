#!/usr/bin/env bash
# Install salon-connect vendor deps when the submodule is present.
# Skips silently on barber/admin-only Vercel deploys (no user app / no submodule checkout).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SC_DIR="${ROOT}/apps/salon-connect"
SC_PKG="${SC_DIR}/package.json"

install_vendor() {
  echo "[ensure-salon-connect] npm install in apps/salon-connect"
  npm install --prefix "$SC_DIR" --no-package-lock
}

if [[ -f "$SC_PKG" ]]; then
  install_vendor
  exit 0
fi

if [[ -f "${ROOT}/.gitmodules" ]] && command -v git >/dev/null 2>&1; then
  if git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1; then
    echo "[ensure-salon-connect] Initializing submodule apps/salon-connect"
    git -C "$ROOT" submodule update --init --recursive apps/salon-connect
    if [[ -f "$SC_PKG" ]]; then
      install_vendor
      exit 0
    fi
  fi
fi

echo "[ensure-salon-connect] apps/salon-connect not available — skip (OK for barber/admin CI)."
