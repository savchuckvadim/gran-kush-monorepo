# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────
# Generic Next.js 16 app image (crm / web / admin).
# Uses Next standalone output; build context = monorepo root.
#   docker build -f infra/docker/next.Dockerfile \
#     --build-arg APP=crm --build-arg NEXT_PUBLIC_API_URL=https://api.example \
#     -t gran-kush/crm .
# APP is the directory name under apps/ (crm | web | admin).
# ─────────────────────────────────────────────────────────────

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# ── Builder ──
FROM base AS builder
ARG APP
# NEXT_PUBLIC_* are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_CRM_URL
ARG NEXT_PUBLIC_MAIN_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CRM_URL=$NEXT_PUBLIC_CRM_URL
ENV NEXT_PUBLIC_MAIN_SITE_URL=$NEXT_PUBLIC_MAIN_SITE_URL
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter "./apps/${APP}" build

# ── Runner ──
FROM base AS runner
ARG APP
ENV APP=$APP
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs
# Standalone bundle mirrors the repo layout (tracing root = monorepo root),
# so the server entry lives at apps/<APP>/server.js.
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/${APP}/.next/static ./apps/${APP}/.next/static
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node apps/$APP/server.js"]
