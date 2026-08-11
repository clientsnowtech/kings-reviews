#!/bin/bash
# Weekly database dump, run by cron on the server:
#
#   0 3 * * 0 /bin/bash /home/trustindexindia/trustindex/scripts/backup-db.sh >> /home/trustindexindia/logs/backup.log 2>&1
#
# The listings are scraped and imported, not typed by hand, so losing them is
# losing weeks of work — but the reviews, the owners and their sign-in state on
# top of them exist nowhere else at all.
set -euo pipefail

APP=/home/trustindexindia/trustindex
OUT=/home/trustindexindia/backups
# Four weeks back. This account filled its disk once already and every failure
# that day looked like something else, so the archive stays small on purpose.
KEEP=4

cd "$APP"

# The credentials live in .env and nowhere else — the same line Prisma reads.
url=$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"'')
if [ -z "$url" ]; then
  echo "$(date -Is) no DATABASE_URL in $APP/.env" >&2
  exit 1
fi

# A password may be percent-encoded in the URL (%40 for @, %23 for #), which is
# exactly what the parse below would choke on — decode it back. Four
# backslashes, because one pair is eaten turning %40 into \x40 and the other
# pair is what printf %b then reads as the hex escape; two would silently hand
# mysqldump the literal "x40" and the dump would fail on a wrong password.
urldecode() {
  local s=${1//+/ }
  printf '%b' "${s//%/\\\\x}"
}

user=$(urldecode "$(sed -E 's#^mysql://([^:]+):.*#\1#' <<<"$url")")
pass=$(urldecode "$(sed -E 's#^mysql://[^:]+:([^@]*)@.*#\1#' <<<"$url")")
host=$(sed -E 's#^mysql://[^@]+@([^:/]+).*#\1#' <<<"$url")
port=$(sed -E 's#^mysql://[^@]+@[^:]+:([0-9]+).*#\1#' <<<"$url")
name=$(sed -E 's#^mysql://[^@]+@[^/]+/([^?]+).*#\1#' <<<"$url")
[[ "$port" =~ ^[0-9]+$ ]] || port=3306

mkdir -p "$OUT"
file="$OUT/trustindex-$(date +%F).sql.gz"

# MYSQL_PWD rather than -p: the password would otherwise sit in the process
#   list for every other account on a shared host to read.
# --no-tablespaces: this DB user has no PROCESS privilege, and without the flag
#   mysqldump refuses before writing a single byte.
# --single-transaction: a consistent snapshot without locking the site out
#   while a hundred thousand rows are read.
echo "=== $(date -Is) dumping $name -> $file"
MYSQL_PWD="$pass" mysqldump \
  --no-tablespaces \
  --single-transaction \
  --quick \
  --default-character-set=utf8mb4 \
  -h "$host" -P "$port" -u "$user" "$name" | gzip -9 > "$file.part"

# Renamed only once the dump has finished, so a run that dies halfway never
# leaves a truncated file sitting there looking like a good backup.
mv "$file.part" "$file"
echo "=== $(date -Is) wrote $(du -h "$file" | cut -f1)"

# Newest first, drop everything past KEEP. The names carry the date, so this is
# an age sort; a find -delete would be shorter but would eat .part files mid-run.
ls -1t "$OUT"/trustindex-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "--- removing $old"
  rm -f "$old"
done
