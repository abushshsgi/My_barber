#!/usr/bin/env bash
# Install salon-connect vendor deps only when the tree is already present.
# Does NOT run `git submodule` (fails on Vercel barber deploy / private repos).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SC_DIR="${ROOT}/apps/salon-connect"
SC_PKG="${SC_DIR}/package.json"

if [[ -f "$SC_PKG" ]]; then
  echo "[ensure-salon-connect] npm install in apps/salon-connect"
  npm install --prefix "$SC_DIR" --no-package-lock
  exit 0
fi

echo "[ensure-salon-connect] apps/salon-connect not present — skip (barber/admin OK)."
exit 0
