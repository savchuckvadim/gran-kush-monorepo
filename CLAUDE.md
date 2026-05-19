# Gran Kush — Monorepo

Turborepo monorepo. Node.js ≥ 20, pnpm workspaces, TypeScript strict mode in every app.

## Repository Structure

```
gran-kush/
├── apps/
│   ├── api/          # NestJS 11 backend (port 3000)
│   ├── crm/          # Next.js 16 CRM for employees (port 5000)
│   ├── web/          # Next.js 16 member portal / LK (port 5001)
│   └── admin/        # Admin app
├── packages/
│   ├── api-client/   # OpenAPI-generated API client (@workspace/api-client)
│   ├── ui/           # Shared UI components (@workspace/ui)
│   ├── eslint-config/
│   ├── prettier-config/
│   └── typescript-config/
└── documentation/    # Project documentation
```

## Commands

### From repo root

- `pnpm dev` — start all dev servers (turbo)
- `pnpm build` — build all packages
- `pnpm lint` — lint all packages
- `pnpm format` — format all files with Prettier

### Per-app commands

```bash
pnpm --filter api dev           # API dev with watch (nest start --watch)
pnpm --filter api build         # nest build
pnpm --filter api test          # jest
pnpm --filter api test:e2e      # jest --config ./test/jest-e2e.json
pnpm --filter api lint          # eslint fix
pnpm --filter api format        # prettier write

pnpm --filter crm dev           # Next.js + turbopack, port 5000
pnpm --filter crm build
pnpm --filter crm typecheck     # tsc --noEmit

pnpm --filter web dev           # Next.js + turbopack, port 5001
pnpm --filter web build
pnpm --filter web typecheck
```

### Database (from apps/api)

```bash
pnpm --filter api prisma:migrate          # prisma migrate dev
pnpm --filter api prisma:migrate:deploy   # prisma migrate deploy (production)
pnpm --filter api prisma:generate         # prisma generate
pnpm --filter api prisma:seed:admin       # ts-node prisma/seed-admin.ts
pnpm --filter api prisma:studio           # prisma studio
```

## Core Stack

### Backend (`apps/api`)

- **NestJS 11** — DDD + Clean Architecture
- **Prisma 7** (with `@prisma/adapter-pg`) — ORM, migrations
- **PostgreSQL** — primary database
- **Redis + BullMQ** — async queues (`mail`, `member-files`, `portal-events`)
- **Passport + JWT** — dual auth (Member / Employee)
- **class-validator + class-transformer** — DTO validation
- **@nestjs/swagger** — OpenAPI (`GET /docs`, `GET /docs-json`)
- **bcrypt** — password hashing (10 rounds)

### Frontend (`apps/crm`, `apps/web`)

- **Next.js 16** (App Router) — React 19
- **TanStack Query v5** — server state
- **Tailwind CSS 4** — styling
- **next-intl** — i18n (`ru`, `en`, `es`)
- **react-hook-form + Zod** — form validation
- **Sonner** — toast notifications (CRM)
- **@workspace/api-client** — OpenAPI-generated client

## Architecture

### Multi-tenant (Portal / Club)

Every business entity (`Employee`, `Member`, `Order`, etc.) is scoped to a **portal** (`portalId`).

Portal context is resolved from HTTP headers:

| Header          | Purpose                      |
|-----------------|------------------------------|
| `X-Portal-Id`   | Portal UUID (preferred)      |
| `X-Portal-Slug` | Portal slug (alternative)    |

After JWT validation, **`PortalTenantMatchGuard`** rejects cross-portal access (→ 403).

Platform registration (create portal + owner): `POST /platform/portals/register`

### URL Routing

**CRM** (employee-facing):

```
/{locale}/{portal}/crm/
/{locale}/{portal}/crm/members
/{locale}/{portal}/crm/members/{memberId}
/{locale}/{portal}/crm/members/{memberId}/documents
/{locale}/{portal}/crm/products
/{locale}/{portal}/crm/orders
/{locale}/{portal}/crm/attendance
/{locale}/{portal}/crm/employees
/{locale}/{portal}/scan
/{locale}/auth/register        — onboarding (no portal yet)
/{locale}/auth/login
```

**LK / Web** (member-facing): `/{locale}/{portal}/...`

### Auth Transport

Two principal types — **Member** and **Employee** — each with web (cookies) and mobile (Bearer) variants.

**Web (HttpOnly cookies)**:

| Flow    | Endpoint                    |
|---------|-----------------------------|
| CRM login  | `POST /crm/auth/login`   |
| CRM refresh| `POST /crm/auth/refresh` |
| CRM logout | `POST /crm/auth/logout`  |
| CRM me     | `GET /crm/auth/me`       |
| LK login   | `POST /lk/auth/login`    |
| LK refresh | `POST /lk/auth/refresh`  |

Cookie names: `crm_access_token`, `crm_refresh_token`, `member_access_token`, `member_refresh_token`.
Cookies: `HttpOnly`, `SameSite=Lax`, `Secure` follows `AUTH_COOKIE_SECURE`.

**Mobile (Bearer `Authorization: Bearer ...`)**:
- CRM: `crm/mobile/auth/*`
- LK: `lk/mobile/auth/*`

Frontend calls API with `credentials: "include"` for cookie auth.

### JWT Tokens

- Access tokens: 15 minutes
- Refresh tokens: 7 days, rotated on use
- Stored in `tokens` (member) and `employee_tokens` (employee) tables

### Employee Roles

`employee` | `manager` | `admin`

## Backend Module Structure

Each feature module follows DDD layers:

```
module-name/
├── api/
│   ├── controllers/    # REST controllers (NestJS decorators only)
│   └── dto/            # Input/output DTOs (class-validator)
├── application/
│   └── services/       # Use-case services (consume repositories only)
├── domain/
│   ├── entity/         # Domain classes
│   └── repositories/   # Repository interfaces (no Prisma types)
└── infrastructure/
    ├── repositories/   # Prisma implementations
    ├── guards/         # Auth guards
    └── strategies/     # Passport strategies
```

**Rule: dependencies go inward** — API → application → domain; infrastructure implements domain contracts.

### Repository Pattern

```ts
// Define include + derived type in infrastructure layer
export const memberAuthInclude = { user: true, signature: true } as const;
export type MemberAuthView = Prisma.MemberGetPayload<{ include: typeof memberAuthInclude }>;

// Repository method — explicit, scenario-named
async findByEmailForAuth(email: string): Promise<MemberAuthView | null>
async findMemberWithStatuses(id: string): Promise<MemberWithStatusView | null>
```

Never leak `Prisma.UserWhereInput` or `Prisma.UserCreateInput` into services.
Never use `Promise<any>` in repository contracts.

## API Conventions

### Error Response Format

All exceptions go through `GlobalExceptionFilter`:

```json
{
  "message": "Human-readable message",
  "errors": ["field constraint", "..."]
}
```

Validation (400): `message: "Validation failed"`, `errors` is string[].
Client: use `assertOpenApiOk(result)` / `getApiErrorMessage(error)` from `@workspace/api-client`.

### Global ValidationPipe

Configured in `main.ts`:
```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

Unknown fields are rejected outright. Every endpoint that accepts input has a typed DTO class.

### CORS

Config in `apps/api/src/common/config/cors/cors.config.ts`.
Allowed headers: `Content-Type`, `Authorization`, `X-Portal-Id`, `X-Portal-Slug`, `X-Device-Id`.
Frontend must use `credentials: "include"` for cookie-based calls.

## Frontend Architecture

### API Client (CRM)

```ts
// apps/crm/modules/shared/api/api.ts
configureApiClient(baseUrl, ApiAuthType.CRM, { authStrategy: "cookie" })
```

`getAuthMiddleware` handles 401 → refresh → retry automatically.

Error handling:
- `notifyApiError(error)` — shows Sonner toast
- `getApiErrorMessage(error)` — extracts message for form inline errors

### FSD (Feature-Sliced Design)

Target architecture for both `apps/crm` and `apps/web`:

- `entities/` — data models and API calls (e.g. `entities/member`)
- `features/` — user interactions
- `shared/` — utilities, API config, UI kit wrappers
- Route pages are thin composition layers

### i18n

Messages via `next-intl`. Locales: `ru`, `en`, `es`.
All routes are prefixed with `/{locale}`.

## Environment Variables

### API (`apps/api/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `CRM_FRONTEND_URL` | CRM cookie domain base |
| `MEMBER_FRONTEND_URL` | LK cookie domain base |
| `COOKIE_SECRET` | cookie-parser signing |
| `AUTH_COOKIE_SECURE` | `true` in production |
| `MAIL_HOST` / `MAIL_USER` / `MAIL_PASS` | SMTP |
| `BOOTSTRAP_ADMIN_ENABLED` | Enable root-admin seed |
| `BOOTSTRAP_ADMIN_EMAIL` | Root admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | Root admin password |

### CRM (`apps/crm/.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of `apps/api` |

## Queue System (BullMQ)

| Queue | Purpose |
|-------|---------|
| `mail` | Email sending (Nodemailer + React Email templates) |
| `member-files` | Async member document/signature processing |
| `portal-events` | Portal registration notifications |

## TypeScript Conventions

- `strict: true` in all packages — `any` requires explicit justification
- `// @ts-ignore` is BANNED; use `// @ts-expect-error <reason>` if unavoidable
- `as` casts outside DTO boundaries require review
- Named exports only — no default exports
- Import from `@workspace/*` packages for shared code, never from `../../../apps/...`
- Use `workspace:*` protocol for internal deps in `package.json`

## Code Style

- No comments unless the WHY is non-obvious
- No `console.log` in production code paths
- Arrow functions preferred
- Group imports: react/next → libraries → `@workspace/*` → local
- Prettier + ESLint gate: `pnpm lint && pnpm --filter api typecheck && pnpm --filter crm typecheck`

## Do NOT

- Do not call `new SomeService()` in business code — use DI constructor injection
- Do not access `req.body` / `req.query` directly in controllers — use decorated params
- Do not leak Prisma types into services or controllers
- Do not use `prisma db push` against staging/production — always use migrations
- Do not concatenate user input into raw SQL
- Do not store auth tokens in `localStorage` — use HttpOnly cookies for web
- Do not query without `portalId` scope in tenant-enforced endpoints
- Do not install deps in the repo root unless they are truly shared tooling
- Do not import from another package's `src/` directly — use its public API

## Key Documentation

- [Backend README](documentation/backend/README.md) — modules, auth, migrations
- [HTTP API Contract](documentation/backend/HTTP_API_CONTRACT.md) — errors, CORS, cookies, portal headers
- [Module Development Principles](documentation/backend/MODULE_DEVELOPMENT_PRINCIPLES.md) — repository rules, query patterns
- [CRM README](documentation/crm/README.md) — routes, FSD, API client usage
- [Authentication](documentation/AUTHENTICATION.md) — dual auth model detail
- [Storage](documentation/STORAGE.md) — private/public file storage
- [Multi-tenant plan](documentation/crm/MULTITENANT_NEXTJS_AUTH_PLAYBOOK.md) — portal scoping strategy
