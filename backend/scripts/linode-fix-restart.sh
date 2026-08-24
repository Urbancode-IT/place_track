#!/usr/bin/env bash
# One-shot Linode fix: pull, scrub .env Firebase placeholder, restart PM2 PlaceTrack.
set -euo pipefail

ROOT="${HOME}/place_track"
BACKEND="${ROOT}/backend"
APP_NAME="Place-track-backend"

cd "$ROOT"
git pull --ff-only

ENV_FILE="${BACKEND}/.env"
if [[ -f "$ENV_FILE" ]]; then
  # Comment any placeholder Firebase path lines
  sed -i 's|^FIREBASE_SERVICE_ACCOUNT_PATH=C:/path/to/.*|# FIREBASE_SERVICE_ACCOUNT_PATH=|' "$ENV_FILE"
  # Ensure empty overrides exist (clears PM2 leftovers when loadEnv override runs)
  grep -q '^FIREBASE_SERVICE_ACCOUNT_PATH=' "$ENV_FILE" || echo 'FIREBASE_SERVICE_ACCOUNT_PATH=' >> "$ENV_FILE"
  grep -q '^FIREBASE_SERVICE_ACCOUNT_JSON=' "$ENV_FILE" || echo 'FIREBASE_SERVICE_ACCOUNT_JSON=' >> "$ENV_FILE"
  # Prefer production frontend URL if still localhost
  sed -i 's|^FRONTEND_URL=http://localhost:5173|FRONTEND_URL=https://placetrack.urbancode.in|' "$ENV_FILE"
  # Prefer SMTP 465 if still 587
  sed -i 's|^SMTP_PORT=587|SMTP_PORT=465|' "$ENV_FILE"
fi

cd "$BACKEND"

# Restart only PlaceTrack (match name prefix)
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME"
elif pm2 jlist | grep -q 'Place-track'; then
  pm2 delete Place-track-backend 2>/dev/null || pm2 delete 2 2>/dev/null || true
fi

pm2 start server.js --name "$APP_NAME"
pm2 save

echo "--- SMTP port check ---"
timeout 8 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/465' && echo "465 OPEN" || echo "465 BLOCKED"
timeout 8 bash -c 'cat < /dev/null > /dev/tcp/smtp.gmail.com/587' && echo "587 OPEN" || echo "587 BLOCKED"

echo "--- health ---"
sleep 2
curl -s http://localhost:5001/health || true
echo
echo "Done. Check: pm2 logs $APP_NAME --lines 20"
