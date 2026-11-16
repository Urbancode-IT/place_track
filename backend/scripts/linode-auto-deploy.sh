#!/usr/bin/env bash
# Auto-deploy PlaceTrack on Linode (git pull + pm2 restart).
# Triggered by POST /api/public/deploy?secret=... or GitHub Action.
set -euo pipefail

ROOT="${PLACE_TRACK_ROOT:-${HOME}/place_track}"
BACKEND="${ROOT}/backend"
APP_NAME="${PM2_APP_NAME:-Place-track-backend}"
LOG="${BACKEND}/logs/auto-deploy.log"
LOCK="${BACKEND}/logs/auto-deploy.lock"

mkdir -p "${BACKEND}/logs"

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) skip — deploy already running" | tee -a "$LOG"
  exit 0
fi

{
  echo "======== $(date -Is) deploy start ========"
  cd "$ROOT"
  echo "cwd=$(pwd) branch=$(git rev-parse --abbrev-ref HEAD) before=$(git rev-parse --short HEAD)"
  git fetch origin
  git pull --ff-only origin main
  echo "after=$(git rev-parse --short HEAD)"

  cd "$BACKEND"
  if [[ -f package-lock.json ]]; then
    npm ci --omit=dev || npm install --omit=dev
  else
    npm install --omit=dev
  fi

  # LF-normalize this script if edited on Windows
  if command -v sed >/dev/null 2>&1; then
    sed -i 's/\r$//' "${BACKEND}/scripts/linode-auto-deploy.sh" 2>/dev/null || true
  fi

  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env
  else
    pm2 start server.js --name "$APP_NAME"
  fi
  pm2 save

  sleep 2
  curl -sS "http://127.0.0.1:5001/health" || true
  echo
  echo "======== $(date -Is) deploy done ========"
} >>"$LOG" 2>&1
