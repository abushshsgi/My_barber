#!/bin/bash
set -u
echo "=== units ==="
systemctl list-units --type=service --all | grep -iE 'mysaloon|tryon' || true
echo "=== worker files ==="
ls -l /etc/systemd/system/mysaloon-tryon* 2>/dev/null || true
echo "=== git remotes ==="
git -C /opt/mysaloon/Mybarber remote -v
git -C /var/www/mysaloon/source remote -v
echo "=== HEAD ==="
git -C /opt/mysaloon/Mybarber log -1 --oneline
git -C /var/www/mysaloon/source log -1 --oneline
echo "=== env keys (masked) ==="
for f in /var/www/mysaloon/source/backend/.env /opt/mysaloon/Mybarber/backend/.env; do
  echo "-- $f --"
  if [ -f "$f" ]; then
    grep -E '^(REDIS_URL|TRYON_|RUNWARE_|TRYON_QUEUE)' "$f" | sed -E 's/(KEY=).*/\1***MASKED***/; s/(URL=).*/\1***MASKED***/'
  else
    echo missing
  fi
done
echo "=== start.sh worker? ==="
ps aux | grep -E 'run_tryon_worker|daphne' | grep -v grep || true
