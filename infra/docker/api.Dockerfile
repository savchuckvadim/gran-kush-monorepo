# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# API (NestJS 11 + Prisma 7) — production image
# Build context = monorepo root.
#   docker build -f infra/docker/api.Dockerfile --build-arg APP_VERSION=$(git rev-parse HEAD) -t gran-kush/api .
# One image for every installation: the brand comes from BRAND at run time (packages/brand).
# ─────────────────────────────────────────────────────────────

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# openssl + ca-certificates are required by the Prisma engines on Debian
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ── Builder: install the whole workspace, generate Prisma client, compile ──
FROM base AS builder
RUN corepack enable
# host node_modules / dist / .next are excluded via root .dockerignore
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter api prisma:generate \
    && pnpm --filter api build
# Only the API with its runtime dependencies: no dev tools and no other apps of the monorepo
# (the full workspace made a 4 GB image that filled the server disk on every deploy).
# dist is git-ignored, so deploy leaves it out and the runner copies it on its own.
# prisma (migrations at start) is a runtime dependency; generate writes the client into the
# deployed node_modules and `prisma version` fetches the schema engine for this platform.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm --filter api deploy --prod --legacy /prod/api \
    && cd /prod/api \
    && ./node_modules/.bin/prisma generate \
    && ./node_modules/.bin/prisma version

# ── Runner ──
FROM base AS runner
# The commit of this build: GET /health reports it, the deploy waits for it (infra/dokploy/deploy.mjs)
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY --from=builder /prod/api ./
COPY --from=builder /app/apps/api/dist ./dist
COPY infra/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh
# Files live in S3 and nothing is written to the image, so the API runs as the unprivileged
# node user. The disk janitor overrides it with root for the Docker socket (compose `user`).
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
CMD ["node", "dist/main"]
