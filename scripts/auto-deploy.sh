#!/bin/bash
# Cron entry point: deploy whenever master moves.
#
# The host firewalls SSH, so GitHub cannot push a deploy in; the server pulls
# instead. Run it every couple of minutes:
#
#   */2 * * * * /bin/bash /home/kingsreviews/kingsreviews/scripts/auto-deploy.sh >> /home/kingsreviews/logs/deploy.log 2>&1
set -euo pipefail

APP=/home/kingsreviews/kingsreviews
LOCK=/home/kingsreviews/tmp/deploy.lock
# The last commit that actually finished a deploy — deliberately not the
# checked-out HEAD. deploy.sh resets the working copy to origin/master as its
# first step, so a deploy that dies later still leaves HEAD on the new commit;
# comparing HEAD then reads as "nothing to do" and the failure is never retried.
# That is exactly how a build that never ran sat there serving the old .next.
STATE=/home/kingsreviews/tmp/deployed.sha

mkdir -p "$(dirname "$LOCK")"
exec 9>"$LOCK"
# A build outlasts the two-minute tick, so skip rather than pile up.
flock -n 9 || exit 0

cd "$APP"
git fetch --quiet --prune origin

deployed=$(cat "$STATE" 2>/dev/null || true)
target=$(git rev-parse origin/master)
[ "$deployed" = "$target" ] && exit 0

echo "=== $(date -Is) deploying ${deployed:0:8}${deployed:+ -> }${target:0:8}"
# A failed deploy has to be shouted about and retried on the next tick, so the
# state file stays on the last commit that actually worked.
if bash "$APP/scripts/deploy.sh"; then
  echo "$target" > "$STATE"
  echo "=== $(date -Is) deployed ${target:0:8}"
else
  echo "=== $(date -Is) DEPLOY FAILED for ${target:0:8} — old build still serving, will retry"
  exit 1
fi
