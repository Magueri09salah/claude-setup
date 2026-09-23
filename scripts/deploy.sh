#!/usr/bin/env bash
#
# Deploy the current branch to this server. Safe to run repeatedly — every step
# is idempotent, and nothing destructive happens without the checks below.
#
#   cd /var/www/codeboujida && ./scripts/deploy.sh
#
# What it does NOT do: create the database, write .env files, or touch nginx.
# Those are one-time setup steps in DEPLOY.md.

# -e  stop at the first failing command (never deploy half a build)
# -u  fail on an undefined variable instead of expanding it to empty
# -o pipefail  a failure anywhere in a pipeline fails the whole line
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/codeboujida}"
API_DIR="$APP_DIR/api"
ADMIN_DIR="$APP_DIR/admin"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/health}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

# ── Preflight ───────────────────────────────────────────────────────────────
# Check everything before changing anything, so a missing file cannot leave the
# server half-deployed.
log "Checking prerequisites"

[ -d "$API_DIR" ]   || fail "$API_DIR not found. Is APP_DIR correct?"
[ -d "$ADMIN_DIR" ] || fail "$ADMIN_DIR not found. Is APP_DIR correct?"
[ -f "$API_DIR/.env" ] || fail "$API_DIR/.env is missing. Copy .env.production.example and fill it in."

command -v node >/dev/null || fail "node is not installed"
command -v npm  >/dev/null || fail "npm is not installed"
command -v pm2  >/dev/null || fail "pm2 is not installed (npm i -g pm2)"

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" != "20" ] && [ "$NODE_MAJOR" != "22" ]; then
  fail "Node $NODE_MAJOR is not supported. This project needs 20 or 22 (vite excludes 21 and 23)."
fi

echo "  node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

# ── Code ────────────────────────────────────────────────────────────────────
cd "$APP_DIR"
log "Pulling latest code"
# --ff-only refuses to create a merge commit: if this fails the server has local
# changes, and you should look at `git status` rather than force anything.
git pull --ff-only

# ── API ─────────────────────────────────────────────────────────────────────
cd "$API_DIR"

log "Installing API dependencies"
# `npm ci` deletes node_modules and installs exactly the lockfile — repeatable,
# unlike `npm install`. Dev dependencies are REQUIRED: the TypeScript compiler
# and the Prisma CLI both live there and are needed to build and migrate.
npm ci

log "Generating Prisma client"
npx prisma generate

log "Applying database migrations"
# `migrate deploy` only applies pending migrations and never prompts. Never use
# `migrate dev` on a server: it can offer to reset (wipe) the database.
npx prisma migrate deploy

log "Building API"
npm run build
[ -f "$API_DIR/dist/index.js" ] || fail "Build produced no dist/index.js"

# ── Admin panel ─────────────────────────────────────────────────────────────
cd "$ADMIN_DIR"

log "Installing admin dependencies"
npm ci

log "Building admin panel"
# Vite inlines VITE_API_URL and the /admin base path at THIS moment — a config
# change only takes effect through a rebuild.
npm run build
[ -f "$ADMIN_DIR/dist/index.html" ] || fail "Build produced no dist/index.html"

# nginx serves these files directly; it needs no reload for a content change.

# ── Restart ─────────────────────────────────────────────────────────────────
cd "$APP_DIR"
log "Reloading the API"
if pm2 describe codeboujida-api >/dev/null 2>&1; then
  # reload = zero-downtime restart of an already-running app
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
# Persist the process list so it comes back after a reboot.
pm2 save

# ── Verify ──────────────────────────────────────────────────────────────────
log "Checking the API responds"
sleep 3
if curl -fsS --max-time 10 "$HEALTH_URL" > /tmp/deploy-health.json 2>/dev/null; then
  echo "  $(cat /tmp/deploy-health.json)"
  # This project stores media in Cloudflare R2. The API refuses to start in
  # production without it, so seeing "local" here means either NODE_ENV is not
  # production or ALLOW_LOCAL_STORAGE was set — both worth stopping for.
  if grep -q '"storage":"local"' /tmp/deploy-health.json; then
    echo ""
    echo "WARNING: media storage is LOCAL DISK, not R2."
    echo "         Uploads are going to api/uploads and are lost if this server is."
    echo "         Check R2_* and NODE_ENV=production in api/.env, then redeploy."
  fi
else
  fail "API did not respond at $HEALTH_URL — check: pm2 logs codeboujida-api --lines 50"
fi

log "Deploy complete"
echo "  Panel: https://codeboujida.com/admin"
echo "  API:   https://codeboujida.com/api/health"
