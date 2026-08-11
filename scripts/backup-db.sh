#!/bin/bash
# Cron entry point for the weekly database backup:
#
#   0 3 * * 0 /bin/bash /home/trustindexindia/trustindex/scripts/backup-db.sh >> /home/trustindexindia/logs/backup.log 2>&1
#
# The work is in backup-db.ts — dump, gzip, upload to Drive, write the row the
# admin panel reads. This file exists only because cron starts in a shell with
# none of CloudLinux's Node on PATH, the same reason deploy.sh does.
set -euo pipefail

APP=/home/trustindexindia/trustindex
VENV=/home/trustindexindia/nodevenv/trustindex/24

# CloudLinux's activate reads CL_VIRTUAL_ENV before setting it, which `set -u`
# treats as fatal — relax it for exactly that line.
set +u
# shellcheck disable=SC1091
source "$VENV/bin/activate"
set -u

cd "$APP"

# node_modules/.bin is not on PATH inside the virtualenv, so tsx is invoked
# through node directly. --env-file is what puts DATABASE_URL, AUTH_SECRET and
# the Google client into a process cron started with an empty environment.
echo "=== $(date -Is) backup starting"
node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/backup-db.ts
echo "=== $(date -Is) backup finished"
