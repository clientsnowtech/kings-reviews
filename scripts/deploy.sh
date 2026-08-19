#!/bin/bash
# Production deploy, run on the cPanel server by scripts/auto-deploy.sh (cron).
#
# Every step here exists because of how CloudLinux packages Node: binaries are
# not on PATH, npm is behind a wrapper that refuses to run once node_modules is
# a real directory (which Turbopack requires), and Passenger restarts only when
# tmp/restart.txt is touched.
set -euo pipefail

APP=/home/kingsreviews/kingsreviews
VENV=/home/kingsreviews/nodevenv/kingsreviews/24
NPM=/opt/alt/alt-nodejs24/root/usr/lib/node_modules/npm/bin/npm-cli.js

# CloudLinux's activate script reads CL_VIRTUAL_ENV before setting it, which
# `set -u` treats as fatal — so relax it for exactly that one line.
set +u
# shellcheck disable=SC1091
source "$VENV/bin/activate"
set -u

cd "$APP"

# Both tools fork a child just to phone home for version checks, and under the
# account's process cap that spawn fails outright with EAGAIN — killing the
# deploy over telemetry nobody reads.
export CHECKPOINT_DISABLE=1
export NEXT_TELEMETRY_DISABLED=1

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
# A build killed mid-flight leaves its lock behind, and every later build then
# refuses to start with "Another next build process is already running".
pkill -f "next/dist/bin/next build" 2>/dev/null || true
rm -f .next/*.lock .next/build.lock .next-build/*.lock .next-build/build.lock

# Build into a staging directory: `next build` empties its output first, and
# the running app serves from that same directory, so building in place took
# the site's CSS and JS down for the length of every deploy.
export NEXT_DIST_DIR=.next-build
rm -rf .next-build
# Left to itself V8 sizes its heap from the machine's RAM, not the account's
# LVE cap, so the static-generation worker overshoots and aborts (SIGABRT).
# Retry: the abort is a threshold, not a deterministic failure.
export NODE_OPTIONS="--max-old-space-size=2048"
built=0
for attempt in 1 2 3; do
  if npm run build; then
    built=1
    break
  fi
  echo "--- build died on attempt $attempt (SIGABRT/SIGSEGV under the memory cap), retrying"
  pkill -f "next/dist/bin/next build" 2>/dev/null || true
  rm -rf .next-build
  sleep 5
done
[ "$built" = 1 ] || { echo "--- build failed three times, leaving the old .next in place"; exit 1; }

echo "--- swapping in the new build"
# Two renames, so the window where .next is missing is microseconds rather than
# the whole build. Passenger picks the new one up on restart.
rm -rf .next-previous
[ -d .next ] && mv .next .next-previous
mv .next-build .next
rm -rf .next-previous

echo "--- restarting"
mkdir -p tmp
touch tmp/restart.txt

echo "--- done"
