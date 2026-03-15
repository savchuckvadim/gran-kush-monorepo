#!/bin/sh
set -e

echo "🚀 Starting application..."

# Применяем миграции
echo "📦 Applying database migrations..."
pnpm --filter api exec prisma migrate deploy || {
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
