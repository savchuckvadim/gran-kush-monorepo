#!/bin/sh
set -e

cd /app/apps/api

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[api] prisma migrate deploy..."
  ./node_modules/.bin/prisma migrate deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[api] seeding platform admin..."
  node dist/seed-admin.main
fi

echo "[api] starting: $*"
exec "$@"
