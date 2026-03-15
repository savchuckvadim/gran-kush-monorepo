# 🐳 Multi-stage build

FROM node:20 AS base


WORKDIR /app

# Установка PNPM
RUN npm install -g npm@11.3.0 && npm install -g pnpm

# Копируем все файлы сразу
COPY . .


# Установка зависимостей и генерация Prisma Client
RUN pnpm config set fetch-retries 5 && \
    pnpm config set fetch-timeout 60000 && \
    pnpm install --no-frozen-lockfile
# RUN pnpm approve-builds
RUN pnpm config set ignore-scripts false

# Сборка NextJS API и проверка
RUN pnpm --filter web run build


# ==== PRODUCTION ====
FROM node:20-slim AS prod


ENV CI=true
ENV NODE_ENV=production
WORKDIR /app



RUN npm install -g pnpm
RUN pnpm add typescript
# Копируем только необходимые файлы

COPY --from=base /app/apps/web/.next ./.next
COPY --from=base /app/apps/web/package.json ./package.json
COPY --from=base /app/package.json ./root-package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=base /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=base /app/packages ./packages
# COPY --from=base /app/apps/web/public ./public
COPY --from=base /app/apps/web/next.config.mjs ./next.config.mjs
# COPY --from=base /app/apps/${APP}/.env ./.env

RUN pnpm config set ignore-scripts false
# Установка PNPM и зависимостей
RUN pnpm install --prod --no-frozen-lockfile
# RUN pnpm install --prod --no-frozen-lockfile && \
#     pnpm --filter ${APP} install --prod --no-frozen-lockfile



# Запуск NextJS
EXPOSE 4420

CMD ["pnpm", "start"]





























# # =====================
# # deps
# # =====================
# FROM node:20 AS deps
# WORKDIR /app

# RUN npm install -g pnpm turbo

# # Копируем ТОЛЬКО файлы зависимостей
# COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# COPY apps/front/package.json apps/front/package.json
# COPY packages packages

# RUN pnpm install --frozen-lockfile

# # =====================
# # builder
# # =====================
# FROM node:20 AS builder
# WORKDIR /app

# # ARG для переменных окружения на этапе сборки
# # Next.js встраивает NEXT_PUBLIC_ переменные в код во время build
# # Значение передается из docker-compose.yml (берется из .env файла)
# ARG NEXT_PUBLIC_API_URL

# RUN npm install -g pnpm turbo

# # 1. Копируем ВСЁ (нужно для prune)
# COPY . .

# # 2. Делаем prune - создает структуру в /app/out/
# RUN turbo prune --scope=front --docker

# # 3. Переходим в pruned структуру
# WORKDIR /app/out

# # 4. Ставим зависимости УЖЕ ПОСЛЕ PRUNE
# # Очищаем кэш pnpm для workspace пакетов, чтобы использовать актуальные версии
# RUN pnpm store prune || true
# RUN pnpm install --frozen-lockfile --force

# # 5. Собираем приложение с переменными окружения
# # Важно: переменная должна быть установлена ДО сборки
# ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# # Отладочный вывод для проверки переменной
# RUN echo "Building with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}"
# # Очищаем кэш Turbo и Next.js перед сборкой
# # Важно: удаляем .next полностью, чтобы Next.js пересобрал все пакеты
# RUN rm -rf .turbo .next apps/front/.next || true
# # Проверяем содержимое файла перед сборкой
# RUN cat packages/nest-api/src/lib/back-api.ts | grep -A 2 "const url" || echo "File not found"
# # Собираем с флагом --no-cache для Next.js, чтобы гарантировать пересборку пакетов
# # RUN pnpm --filter front build -- --no-cache || pnpm --filter front build

# RUN pnpm --filter front build


# # =====================
# # runner
# # =====================
# FROM node:20-slim AS runner
# WORKDIR /app
# ENV NODE_ENV=production
# ENV PORT=5000

# # Устанавливаем pnpm
# RUN npm install -g pnpm

# # Копируем всю pruned структуру для правильной работы workspace
# COPY --from=builder /app/out/full/ ./
# COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
# COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# # Устанавливаем все зависимости (включая devDependencies)
# # TypeScript нужен для загрузки next.config.ts в runtime Next.js
# # Это нормально для production, так как TypeScript используется только для загрузки конфига
# RUN pnpm install --frozen-lockfile

# # Переходим в директорию приложения
# WORKDIR /app/apps/front

# EXPOSE 5000
# # Используем pnpm start из директории приложения
# CMD ["pnpm", "start"]

