#!/bin/sh
set -e

echo "🚀 Starting application..."

# Остаемся в корне монорепо для правильной работы pnpm workspace
cd /app

# Проверяем наличие миграций
echo "🔍 Checking migrations directory..."
if [ -d "apps/api/prisma/migrations" ]; then
    echo "✅ Migrations directory found"
    ls -la apps/api/prisma/migrations/ || true
else
    echo "❌ Migrations directory not found!"
    exit 1
fi

# Применяем миграции (используем --filter для монорепо)
echo "📦 Applying database migrations..."
pnpm --filter api run prisma:migrate:deploy || {
    echo "❌ Migration failed!"
    exit 1
}

# Создаем super admin (если включен)
if [ "$BOOTSTRAP_ADMIN_ENABLED" = "true" ]; then
    echo "👤 Seeding bootstrap admin..."
    pnpm --filter api run prisma:seed:admin || {
        echo "⚠️  Admin seed failed, but continuing..."
    }
else
    echo "⏭️  Skipping admin seed (BOOTSTRAP_ADMIN_ENABLED=false)"
fi

# Запускаем приложение
echo "✅ Starting NestJS application..."
exec "$@"
