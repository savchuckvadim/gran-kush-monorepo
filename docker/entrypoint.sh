#!/bin/sh
set -e

echo "🚀 Starting application..."

# Применяем миграции (нужно быть в директории apps/api для Prisma)
echo "📦 Applying database migrations..."
cd /app/apps/api

# Проверяем наличие миграций
echo "🔍 Checking migrations directory..."
if [ -d "prisma/migrations" ]; then
    echo "✅ Migrations directory found"
    ls -la prisma/migrations/ || true
else
    echo "❌ Migrations directory not found!"
    exit 1
fi

pnpm run prisma:migrate:deploy || {
    echo "❌ Migration failed!"
    exit 1
}

# Создаем super admin (если включен)
if [ "$BOOTSTRAP_ADMIN_ENABLED" = "true" ]; then
    echo "👤 Seeding bootstrap admin..."
    pnpm run prisma:seed:admin || {
        echo "⚠️  Admin seed failed, but continuing..."
    }
else
    echo "⏭️  Skipping admin seed (BOOTSTRAP_ADMIN_ENABLED=false)"
fi

# Запускаем приложение (возвращаемся в корень для правильного пути)
cd /app
echo "✅ Starting NestJS application..."
exec "$@"
