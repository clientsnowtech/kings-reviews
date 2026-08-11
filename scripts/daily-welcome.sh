#!/bin/bash
# Cron entry point for the daily set-password mails:
#
#   30 9 * * * /bin/bash /home/trustindexindia/trustindex/scripts/daily-welcome.sh >> /home/trustindexindia/logs/welcome.log 2>&1
#
# The work is in send-daily-welcome.ts — 280 owners a day, once each, under
# Brevo's 300-a-day ceiling. This file exists only because cron starts in a
# shell with none of CloudLinux's Node on PATH, the same reason deploy.sh does.
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
# through node directly. --env-file is what puts DATABASE_URL and the mail
# settings into a process cron started with an empty environment.
echo "=== $(date -Is) welcome mails starting"
node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/send-daily-welcome.ts
echo "=== $(date -Is) welcome mails finished"
