#!/bin/bash
# Cron entry point: deploy whenever master moves.
#
# The host firewalls SSH, so GitHub cannot push a deploy in; the server pulls
# instead. Run it every couple of minutes:
#
#   */2 * * * * /bin/bash /home/trustindexindia/trustindex/scripts/auto-deploy.sh >> /home/trustindexindia/logs/deploy.log 2>&1
set -euo pipefail

APP=/home/trustindexindia/trustindex
LOCK=/home/trustindexindia/tmp/deploy.lock

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
# A build outlasts the two-minute tick, so skip rather than pile up.
flock -n 9 || exit 0

cd "$APP"
git fetch --quiet --prune origin

current=$(git rev-parse HEAD)
target=$(git rev-parse origin/master)
[ "$current" = "$target" ] && exit 0

echo "=== $(date -Is) deploying ${current:0:8} -> ${target:0:8}"
bash "$APP/scripts/deploy.sh"
echo "=== $(date -Is) deployed ${target:0:8}"
