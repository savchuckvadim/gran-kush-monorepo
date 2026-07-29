#!/bin/sh
set -e

cd /app/apps/api

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[api] prisma migrate deploy..."
  pnpm prisma:migrate:deploy
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[api] seeding platform admin..."
  pnpm prisma:seed:admin
fi

echo "[api] starting: $*"
exec "$@"
