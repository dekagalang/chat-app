#!/bin/bash

# Runtime deploy script for the standalone build repository.
# Run this from the cloned build repo on the VPS.

set -euo pipefail

APP_DIR=${APP_DIR:-$(pwd)}
APP_NAME=${APP_NAME:-chat-app}
PORT=${PORT:-5000}

cd "$APP_DIR"

if [ ! -f "server.js" ]; then
  echo "server.js not found. Run this script from the standalone build directory."
  exit 1
fi

if [ -f ".env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

export NODE_ENV=${NODE_ENV:-production}
export APP_NAME=${APP_NAME}
export PORT=${PORT}

mkdir -p logs

if ! command -v pm2 >/dev/null 2>&1; then
  echo "PM2 not found. Installing PM2 globally..."
  npm install -g pm2
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  echo "Reloading $APP_NAME..."
  pm2 reload ecosystem.config.js --only "$APP_NAME" --update-env
else
  echo "Starting $APP_NAME..."
  pm2 start ecosystem.config.js --only "$APP_NAME" --update-env
fi

pm2 save || true
pm2 status "$APP_NAME"
