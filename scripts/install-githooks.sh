#!/bin/sh
set -e
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
chmod +x "$root/.githooks/post-commit"
git -C "$root" config core.hooksPath .githooks
echo "Git hooks installed: commits will auto-push to origin."
