FROM node:20-slim

WORKDIR /app

# Устанавливаем OpenSSL для Prisma
RUN apt-get update && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Устанавливаем pnpm
RUN npm install -g pnpm

# Копируем всё монорепо
COPY . .

# Ставим зависимости с учётом workspaces
RUN pnpm install --frozen-lockfile

# Генерируем Prisma
RUN pnpm --filter back exec prisma generate

# Строим только API
RUN pnpm --filter back build

EXPOSE 7000
CMD ["node", "apps/api/dist/main"]

