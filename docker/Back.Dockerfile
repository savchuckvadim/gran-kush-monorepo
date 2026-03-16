FROM node:20-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# ---- workspace файлы ----
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# turborepo (если есть)
COPY turbo.json ./

# ---- package.json пакетов ----
COPY apps/api/package.json apps/api/package.json
COPY packages/*/package.json packages/

# 👇 ВАЖНО: prisma schema должна быть доступна
COPY apps/api/prisma apps/api/prisma

# install
RUN pnpm install --frozen-lockfile

# ---- исходный код ----
COPY . .

# prisma
RUN pnpm --filter api exec prisma generate

# build
RUN pnpm --filter api build




# Применяем миграции и создаем admin при старте
# (через entrypoint скрипт)


# COPY docker/entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh

EXPOSE 4200

# ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/api/dist/src/main.js"]
