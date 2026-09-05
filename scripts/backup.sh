#!/usr/bin/env bash
#
# Nightly PostgreSQL backup — one timestamped, compressed dump per run.
#
#   ./scripts/backup.sh          # run once, by hand
#
# Credentials are read from api/.env, so the password lives in exactly one
# place. Nothing here prints it.
#
# Restoring is DESTRUCTIVE and is NOT automated — see the bottom of this file.

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/codeboujida}"
ENV_FILE="$APP_DIR/api/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/codeboujida}"
# Two weeks of history. Older dumps are deleted at the end of each run so the
# disk cannot fill silently.
RETENTION_DAYS="${RETENTION_DAYS:-14}"

fail() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found"
command -v pg_dump >/dev/null || fail "pg_dump not installed (apt install postgresql-client)"

# Take DATABASE_URL from .env without sourcing the file — sourcing would execute
# whatever is in it, and any unquoted special character would break the shell.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d '=' -f 2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL is empty in $ENV_FILE"

mkdir -p "$BACKUP_DIR"
# Dumps contain every user record: owner-only.
chmod 700 "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d_%H%M%S)"
OUT="$BACKUP_DIR/codeboujida_$STAMP.sql.gz"

echo "[$(date -Is)] dumping to $OUT"

# --no-owner / --no-privileges: the dump restores cleanly even if the database
# role is named differently on the machine you restore onto.
# Writing to .part first means an interrupted run never leaves a file that looks
# like a valid backup.
pg_dump --no-owner --no-privileges --format=plain "$DATABASE_URL" \
  | gzip -9 > "$OUT.part"
mv "$OUT.part" "$OUT"
chmod 600 "$OUT"

# A dump of a live database is never this small; if it is, something failed
# quietly and you want to know tonight, not the day you need to restore.
SIZE="$(stat -c %s "$OUT")"
if [ "$SIZE" -lt 1024 ]; then
  fail "backup is only ${SIZE} bytes — treat it as failed and check the credentials"
fi

echo "[$(date -Is)] ok — $(du -h "$OUT" | cut -f1)"

# ── Media files ─────────────────────────────────────────────────────────────
# Only relevant while storage is LOCAL (R2_* empty in api/.env). The database
# stores file KEYS, not the files — so without this, losing the disk would leave
# a database full of references to images that no longer exist.
#
# Mirrored, not archived: a nightly tar of several GB of video would fill the
# disk within days, while a mirror keeps exactly one up-to-date copy.
UPLOADS_DIR="$APP_DIR/api/uploads"
if [ -d "$UPLOADS_DIR" ] && [ -n "$(ls -A "$UPLOADS_DIR" 2>/dev/null)" ]; then
  if command -v rsync >/dev/null; then
    echo "[$(date -Is)] mirroring media from $UPLOADS_DIR"
    # --delete keeps the mirror honest: files removed in the app disappear here
    # too, so the mirror always matches the live folder rather than growing.
    rsync -a --delete "$UPLOADS_DIR/" "$BACKUP_DIR/uploads-mirror/"
    echo "[$(date -Is)] media mirror: $(du -sh "$BACKUP_DIR/uploads-mirror" | cut -f1)"
  else
    echo "[$(date -Is)] WARNING: rsync not installed — media NOT backed up (apt install rsync)"
  fi
else
  echo "[$(date -Is)] no local media to mirror (storage is R2, or nothing uploaded yet)"
fi

# Prune old dumps.
DELETED="$(find "$BACKUP_DIR" -name 'codeboujida_*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete | wc -l)"
echo "[$(date -Is)] pruned $DELETED backup(s) older than $RETENTION_DAYS days"
echo "[$(date -Is)] on disk: $(find "$BACKUP_DIR" -name 'codeboujida_*.sql.gz' | wc -l) backup(s), $(du -sh "$BACKUP_DIR" | cut -f1)"

# ─────────────────────────────────────────────────────────────────────────────
# RESTORING — destructive, run only deliberately.
#
#   1. Stop the API first, or it will write into a half-restored database:
#        pm2 stop codeboujida-api
#   2. Back up the CURRENT state before overwriting it:
#        ./scripts/backup.sh
#   3. Drop and recreate the schema, then load the dump:
#        gunzip -c /var/backups/codeboujida/codeboujida_<STAMP>.sql.gz \
#          | psql "<DATABASE_URL>"
#   4. pm2 start codeboujida-api
#
# These dumps live on the same disk as the database: they protect against a bad
# migration or a mistaken delete, NOT against losing the server. Copy them off
# the machine as well — e.g. `rclone copy` to the same Cloudflare R2 account
# that already stores your media.
# ─────────────────────────────────────────────────────────────────────────────
