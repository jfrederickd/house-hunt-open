#!/bin/sh
set -e

# Refuse to start in production without the auth gate configured, so the app is
# never accidentally exposed without a password.
if [ "$NODE_ENV" = "production" ]; then
  if [ -z "$APP_PASSWORD" ] || [ -z "$AUTH_SECRET" ]; then
    echo "FATAL: APP_PASSWORD and AUTH_SECRET must be set in production." >&2
    exit 1
  fi
fi

echo "→ Applying database migrations"
node_modules/.bin/prisma migrate deploy

echo "→ Seeding people & criteria (only if empty)"
node_modules/.bin/tsx prisma/bootstrap.ts

# Persist uploaded photos on the mounted volume: point public/uploads at /data/uploads.
echo "→ Linking uploads to the persistent volume"
mkdir -p /data/uploads
rm -rf ./public/uploads
ln -sfn /data/uploads ./public/uploads

echo "→ Starting Next.js on ${PORT:-3000}"
exec node_modules/.bin/next start -p "${PORT:-3000}" -H 0.0.0.0
