# Gran Kush — Monorepo

Turborepo monorepo. Node.js ≥ 20, pnpm workspaces, TypeScript strict mode in every app.

## Repository Structure

```
gran-kush/
├── apps/
│   ├── api/          # NestJS 11 backend (port 3000)
│   ├── crm/          # Next.js 16: CRM for employees + member cabinet on club. (port 5000)
│   ├── site/         # Next.js 16 + Payload 3: product sites PafPaf / Ink Space / Plis Plas (port 5002)
│   ├── itfirma/      # Next.js 16: IT-firma studio site, services + lead form, no CMS (port 5003)
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

pnpm --filter site dev          # Next.js + Payload, port 5002 (documentation/site/PRODUCT_SITES.md)
pnpm --filter site seed         # PafPaf content in es/ru/en
pnpm --filter site generate     # payload-types.ts + admin import map
pnpm --filter site migrate:create <name>   # after changing collections/blocks; production applies it on start

pnpm --filter itfirma dev       # studio site, port 5003, es/en/ru/uk/ca (documentation/site/ITFIRMA.md)
```

### Database (from apps/api)

```bash
pnpm --filter api prisma:migrate          # prisma migrate dev
pnpm --filter api prisma:migrate:deploy   # prisma migrate deploy (production)
pnpm --filter api prisma:generate         # prisma generate
pnpm --filter api prisma:seed:admin       # ts-node src/seed-admin.main.ts
pnpm --filter api prisma:studio           # prisma studio
```

## Core Stack

### Backend (`apps/api`)

- **NestJS 11** — DDD + Clean Architecture
- **Prisma 7** (with `@prisma/adapter-pg`) — ORM, migrations
- **PostgreSQL** — primary database
- **Redis + BullMQ** — async queues (`mail`, `member-files`, `domain-events`, `operations`)
- **Domain events** — transactional outbox + `@OnDomainEvent` consumers, contract in `@workspace/domain-events` ([DOMAIN_EVENTS](documentation/backend/DOMAIN_EVENTS.md))
- **Passport + JWT** — dual auth (Member / Employee)
- **class-validator + class-transformer** — DTO validation
- **@nestjs/swagger** — OpenAPI (`GET /docs`, `GET /docs-json`)
- **bcrypt** — password hashing (10 rounds)

### Frontend (`apps/crm`)

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

| Header          | Purpose                   |
| --------------- | ------------------------- |
| `X-Portal-Id`   | Portal UUID (preferred)   |
| `X-Portal-Slug` | Portal slug (alternative) |

After JWT validation, **`PortalTenantMatchGuard`** rejects cross-portal access (→ 403).

Platform registration (create portal + owner): `POST /platform/portals/register`

### URL Routing

**CRM** (employee-facing):

```
/{locale}/{portal}/crm/
/{locale}/{portal}/crm/feed          — club feed: events and team posts (first menu item)
/{locale}/{portal}/crm/members
/{locale}/{portal}/crm/members/{memberId}
/{locale}/{portal}/crm/members/{memberId}/documents
/{locale}/{portal}/crm/products
/{locale}/{portal}/crm/orders
/{locale}/{portal}/crm/attendance
/{locale}/{portal}/crm/employees
/{locale}/{portal}/crm/finance          — ledger: overview, entries, expenses, counterparties, months
/{locale}/{portal}/crm/finance/settings — organization, tax rates, income and expense categories
/{locale}/{portal}/scan
/{locale}/auth/register        — onboarding (no portal yet)
/{locale}/auth/login
```

**Cabinet** (member-facing, the same CRM app on `club.paf-paf.app`; `proxy.ts` routes by host,
rules in `modules/shared/config/club-routes.ts`):

```
/{locale}                      home: my clubs, memberships waiting for confirmation
/{locale}/auth/…               login, registration, password reset, email confirmation
/{locale}/me/clubs | passport  account: memberships, documents and signature
/{locale}/{club}               club: QR, presence, visits
/{locale}/join/{token}         club link (shared CRM page)
/{locale}/consent/{token}      consent from an email (shared CRM page)
```

### Auth Transport

Two principal types — **Member** and **Employee** — each with web (cookies) and mobile (Bearer) variants.

**Web (HttpOnly cookies)**:

| Flow            | Endpoint                     |
| --------------- | ---------------------------- |
| CRM login       | `POST /crm/auth/login`       |
| CRM refresh     | `POST /crm/auth/refresh`     |
| CRM logout      | `POST /crm/auth/logout`      |
| CRM me          | `GET /crm/auth/me`           |
| Cabinet login   | `POST /cabinet/auth/login`   |
| Cabinet refresh | `POST /cabinet/auth/refresh` |

Every sign-in is an **auth session** (`auth_sessions`: account × app × device), checked on every request —
revocation is immediate ([AUTH_ARCHITECTURE](documentation/backend/AUTH_ARCHITECTURE.md)).
Cookies: `crm_access` / `cabinet_access` and `crm_refresh` / `cabinet_refresh` (path `/{aud}/auth`) are host-only
on the API; `crm_session` / `cabinet_session=1` on `AUTH_HINT_COOKIE_DOMAIN` is the hint for `proxy.ts`.
All `HttpOnly`, `SameSite=Lax`, `Secure` follows `AUTH_COOKIE_SECURE`. Refresh 401 `refresh_superseded` — another
tab won the rotation (retry), `session_ended` — sign in again.

**Mobile (Bearer `Authorization: Bearer ...`)**:

- CRM: `crm/mobile/auth/*`
- Cabinet: `cabinet/mobile/auth/*`

Controllers protect routes with `@CrmSession()` / `@CrmAuth({ subscription?, module? })` / `@CabinetSession()` /
`@CabinetAuth()` (one guard reads Bearer or the cookie) and `@RequirePermission(...)` for club permissions.
`module: "finance"` closes a route while the club has the module off (403 `module_disabled`); modules are
rows of `portal_modules`, the catalog is `portal/crm/portal-modules/domain/portal-module.catalog.ts`.

Frontend calls API with `credentials: "include"` for cookie auth.

### JWT Tokens

- Access `{ sub, sid, typ }` with `aud`: 15 minutes; refresh: 7 days, its own secret, rotated on use
- Only the refresh hash is stored (`auth_sessions.refresh_token_hash`)

### Employee Roles

Club roles (`portal_roles`): system `owner`, `admin` (full access), `manager`, `employee` (editable
permissions) and custom `custom_<hex>`. Permission codes — `modules/portal/crm/access/domain/permissions.ts`.

## Backend Module Structure

Each feature module follows DDD layers:

```
module-name/
├── api/
│   ├── controllers/    # REST controllers (NestJS decorators only)
│   └── dto/            # Input/output DTOs (class-validator)
├── application/
│   ├── services/       # Reusable module operations: queries, one aggregate (consume repositories)
│   └── use-cases/      # One class per complex scenario: <name>.use-case.ts, execute()
├── domain/
│   ├── entity/         # Domain classes
│   └── repositories/   # Repository interfaces (no Prisma types)
└── infrastructure/
    ├── repositories/   # Prisma implementations
    ├── guards/         # Auth guards
    └── strategies/     # Passport strategies
```

**Rule: dependencies go inward** — API → application → domain; infrastructure implements domain contracts.

**Use cases for complex flows.** A scenario that combines several services or modules, decides who may do
what, or spans a transaction (place a cabinet order, a staff order, join a club, accept an invitation) is a
class in `application/use-cases/<scenario>.use-case.ts` with one `execute()` method. Its doc comment lists
the rules of the scenario. Controllers call the use case and hold no business rules (role checks beyond
guards, cross-module checks). Services in `application/services/` stay reusable operations of the module;
simple CRUD needs no use-case wrapper. Example: `orders/application/use-cases/place-staff-order.use-case.ts`.

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

All exceptions go through `GlobalExceptionFilter` (`APP_FILTER` in `AppModule`):

```json
{
    "message": "Human-readable message",
    "errors": ["field constraint", "..."]
}
```

`errors` is always an array (empty when there are no details). Validation (400): `message: "Validation failed"`, `errors` lists constraint messages. 5xx never expose exception text: `message: "Internal server error"`, details go to the log.
Client: use `assertOpenApiOk(result)` / `getApiErrorMessage(error)` from `@workspace/api-client`.

### Global ValidationPipe

Registered as `APP_PIPE` in `AppModule` (`common/config/validation/validation.config.ts`), so e2e tests run the same pipe — do not add `useGlobalPipes` in tests:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
```

Unknown fields are rejected outright (400, `property x should not exist`) — in bodies and in query strings. Every endpoint that accepts input has a typed DTO class. **One `@Query()` DTO per handler**: pagination + filters are merged via `IntersectionType(PaginationDto, XxxFilterDto)`; two DTOs on the same query reject each other's fields.

### CORS

Config in `apps/api/src/common/config/cors/cors.config.ts`.
Allowed headers: `Content-Type`, `Authorization`, `X-Portal-Id`, `X-Portal-Slug`, `X-Device-Id`.
Frontend must use `credentials: "include"` for cookie-based calls.

## Frontend Architecture

### API Client (CRM)

```ts
// apps/crm/modules/shared/api/api.ts
configureApiClient(baseUrl, ApiAuthType.CRM, { getPortalSlug, getLocale });
```

Session lives in HttpOnly cookies only. `getAuthMiddleware` handles 401 → refresh → retry automatically;
`refresh: false` turns that off for an app whose own server refreshes the session (`apps/admin` proxy).

Error handling:

- `notifyApiError(error)` — shows Sonner toast
- `getApiErrorMessage(error)` — extracts message for form inline errors

### FSD (Feature-Sliced Design)

Target architecture for `apps/crm` (CRM and cabinet trees alike):

- `entities/` — data models and API calls (e.g. `entities/member`)
- `features/` — user interactions
- `shared/` — utilities, API config, UI kit wrappers
- Route pages are thin composition layers

### i18n

Messages via `next-intl`. Locales: `ru`, `en`, `es`.
All routes are prefixed with `/{locale}`.

## Environment Variables

### API (`apps/api/.env`)

| Variable                                | Purpose                                                  |
| --------------------------------------- | -------------------------------------------------------- |
| `DATABASE_URL`                          | PostgreSQL connection string                             |
| `REDIS_URL`                             | Redis connection string                                  |
| `JWT_SECRET`                            | Access token signing secret                              |
| `JWT_REFRESH_SECRET`                    | Refresh token signing secret                             |
| `CORS_ORIGIN`                           | Comma-separated allowed origins                          |
| `CRM_FRONTEND_URL`                      | CRM origin: links in emails, OAuth redirects             |
| `MEMBER_FRONTEND_URL`                   | Cabinet origin (club.): links in emails, OAuth redirects |
| `AUTH_HINT_COOKIE_DOMAIN`               | Domain of the `*_session` hint cookie (`.paf-paf.app`)   |
| `COOKIE_SECRET`                         | cookie-parser signing                                    |
| `AUTH_COOKIE_SECURE`                    | `true` in production                                     |
| `MAIL_HOST` / `MAIL_USER` / `MAIL_PASS` | SMTP                                                     |
| `BOOTSTRAP_ADMIN_ENABLED`               | Enable root-admin seed                                   |
| `BOOTSTRAP_ADMIN_EMAIL`                 | Root admin email                                         |
| `BOOTSTRAP_ADMIN_PASSWORD`              | Root admin password                                      |

### CRM (`apps/crm/.env.local`)

| Variable              | Purpose                |
| --------------------- | ---------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of `apps/api` |

## Queue System (BullMQ)

| Queue           | Purpose                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| `mail`          | Email sending (Nodemailer + React Email templates)                                           |
| `member-files`  | Async member document/signature processing                                                   |
| `domain-events` | Delivery of domain events to consumers (one job per consumer)                                |
| `operations`    | Background operations: a route marked `@BackgroundOperation` answers 202, the work runs here |

**Background operations.** A heavy route (exports, filings, mailings) is marked
`@BackgroundOperation(definition)`, returns the operation input and answers `202 { operationId }`; a
provider with `@RunsOperation(definition)` does the work; the author gets `operation.finished / failed`
over the socket and reads `GET /crm/operations/:id`. Orders and ordinary forms stay synchronous.
Details: [BACKGROUND_OPERATIONS](documentation/backend/BACKGROUND_OPERATIONS.md).

**Domain events.** Anything another part of the system must learn about (realtime, notifications,
journal, letters) is a domain event written in the transaction of the change: repositories take
`events` and call `DomainEventPublisher.publishMany(tx, …)`. `portalId` is part of every club event.
Payloads carry ids and statuses only — no money, no personal data. Details:
[DOMAIN_EVENTS](documentation/backend/DOMAIN_EVENTS.md).

**Realtime.** socket.io namespaces `/crm` and `/cabinet` deliver those events to the fronts; a page
refetches its queries by the rules in `entities/<x>/realtime.ts`. A new screen that must stay live
needs a rule there, not polling. Details: [REALTIME](documentation/backend/REALTIME.md).

## TypeScript Conventions

- `strict: true` in all packages — `any` requires explicit justification
- `// @ts-ignore` is BANNED; use `// @ts-expect-error <reason>` if unavoidable
- `as` casts outside DTO boundaries require review
- Named exports only — no default exports (except files Next.js requires to default-export: `page`, `layout`, `icon`, `apple-icon`, `opengraph-image`, …)
- Import from `@workspace/*` packages for shared code, never from `../../../apps/...`
- Use `workspace:*` protocol for internal deps in `package.json`

## Code Style

- No comments unless the WHY is non-obvious. A comment explains intent, a contract or a constraint (what a class guarantees, why a check exists) in full sentences; it does not narrate the code, keep commented-out code or point at the chat. A class or exported function with non-trivial rules gets a doc comment (`/** … */`).
- **Compose UI primitives once.** A set of shadcn primitives that two places repeat (Dialog + Header + Title +
  Description + Footer, a dropdown of clubs, an account card) becomes one component: app-independent ones in
  `packages/ui/src/shared` (`ModalDialog`, `ConfirmDialog`, `SlideOver`, `Field`), app-specific ones in the
  app's `modules/shared/ui`. Features and pages use that component, not the raw `Dialog*` / `DropdownMenu*` set.
- **One component per file.** A `.tsx` file holds exactly one React component (exported or private); a second component — even a tiny one — goes to its own file next to it. Plain helpers (pure functions, constants, types) may stay.
- **300 lines max** for a file, a class or a component. Split by responsibility (SOLID: one reason to change), not by cutting a file in half; when you touch a file that is already over the limit, split the part you change.
- **No hardcode and no temporary workarounds.** Hosts, URLs, limits, timeouts and feature switches come from env/config or named constants in a config module; magic strings and numbers in business code are not allowed. A workaround is acceptable only with a task number and a plan to remove it.
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
- [Domain events](documentation/backend/DOMAIN_EVENTS.md) — outbox, catalog, consumers, how to add an event
- [Realtime](documentation/backend/REALTIME.md) — socket.io gateway, rooms, client rules
- [Background operations](documentation/backend/BACKGROUND_OPERATIONS.md) — 202 + operation id, `operations` queue, runners, CRM hooks
