# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# API (NestJS 11 + Prisma 7) — production image
# Build context = monorepo root.
#   docker build -f infra/docker/api.Dockerfile -t gran-kush/api .
# ─────────────────────────────────────────────────────────────

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# openssl + ca-certificates are required by the Prisma query engine on Debian
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ── Builder: install the whole workspace, generate Prisma client, compile ──
FROM base AS builder
# host node_modules / dist / .next are excluded via root .dockerignore
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter api prisma:generate \
    && pnpm --filter api build

# ── Runner ──
# We keep the full workspace (incl. dev deps) so that `prisma migrate deploy`
# and the ts-node admin seed can run from the entrypoint at container start.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app /app
COPY infra/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
WORKDIR /app/apps/api
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "dist/main"]
