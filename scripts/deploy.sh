#!/bin/bash
# Production deploy, run on the cPanel server by .github/workflows/deploy.yml.
#
# Every step here exists because of how CloudLinux packages Node: binaries are
# not on PATH, npm is behind a wrapper that refuses to run once node_modules is
# a real directory (which Turbopack requires), and Passenger restarts only when
# tmp/restart.txt is touched.
set -euo pipefail

APP=/home/trustindexindia/trustindex
VENV=/home/trustindexindia/nodevenv/trustindex/24
NPM=/opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js

# CloudLinux's activate script reads CL_VIRTUAL_ENV before setting it, which
# `set -u` treats as fatal — so relax it for exactly that one line.
set +u
# shellcheck disable=SC1091
source "$VENV/bin/activate"
set -u

cd "$APP"

echo "--- pulling"
git fetch --prune origin
git reset --hard origin/master

echo "--- installing"
# --include=dev: the venv sets NODE_ENV=production, which would drop the
# build-only dependencies (Tailwind's PostCSS plugin, TypeScript).
node "$NPM" install --include=dev --no-audit --no-fund

echo "--- prisma"
node node_modules/prisma/build/index.js generate
# Aborts by itself if the schema change would drop data.
node node_modules/prisma/build/index.js db push

echo "--- building"
npm run build

echo "--- restarting"
mkdir -p tmp
touch tmp/restart.txt

echo "--- done"
