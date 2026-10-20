# Gran Kush Documentation

## Purpose

Unified documentation for the platform split into three product areas:

- **Member cabinet** - part of `apps/crm`, served on `club.paf-paf.app`
- **CRM for Employees** - `apps/crm` operational interface for staff
- **Backend API** - `apps/api` modules, contracts, storage, queues, auth

## Product Documentation Map

### 1) Member cabinet

- [Cabinet plan and decisions](./tasks/member-cabinet.md) — routes, ownership and consent, passport, QR, what is left
- [Product sites](./site/PRODUCT_SITES.md) — paf-paf.app (`apps/site`)

### 2) CRM for Employees

- [CRM Documentation](./crm/README.md)
- Covers current CRM routes, member operations, employee auth integration, and implementation tasks
- [Realtime](./backend/REALTIME.md) — how the CRM and the cabinet stay live; [Domain events](./backend/DOMAIN_EVENTS.md)
- [Events, realtime, notifications](./tasks/events-realtime.md) — domain events with outbox, socket.io gateway, query invalidation registry (TASK-780, 794, 795, 781)
- [Finance and accounting](./tasks/finance-accounting.md) — organization profile, taxes on products, encrypted ledger with spreadsheet import, purchases and margin, payroll, reports and declarations (TASK-796…806); research: [finance-requirements](./tasks/finance-requirements.md)
- [Flexible CRM domain tasks (fields, statuses, settings, inventory, integrations)](./crm/FLEXIBLE_CRM_DOMAIN_TASKS.md) — roadmap: dynamic fields/statuses, portal settings, products, stock ledger, finance snapshots, attendance heatmap, external club site embeds

### 3) Backend

- [Backend Documentation](./backend/README.md)
- [HTTP API Contract](./backend/HTTP_API_CONTRACT.md) — errors, CORS, portal headers (`X-Portal-*`), web cookies vs mobile Bearer
- Covers module architecture, API boundaries, migrations, bootstrap admin seed, and runtime setup

### 4) Brand & Positioning

- Philosophy — brand concept, manifesto, tone of voice, naming shortlist and domain plan; kept **outside the repository** (`_private/philosophy` next to the checkout), not tracked in git

## Cross-Cutting Technical Docs

- [Идемпотентность и масштабирование](./backend/IDEMPOTENCY_AND_SCALING.md) — реплики, оплата, изоляция порталов, куки и домены; план: [scaling-roadmap](./tasks/scaling-roadmap.md)
- [Развёртывание на чистом VPS](./VPS_SETUP.md) — пошаговый рунбук Hetzner + Cloudflare: сервер, DNS, TLS, первый запуск, автодеплой, бэкапы
- [Развёртывание и эксплуатация](./DEPLOYMENT.md) — справочник для DevOps: инфраструктура, env, CI/CD, домены и куки, реплики
- [Work log](./HISTORY.md) — dated notes on non-obvious bugs and the decisions behind their fixes
- [Authentication System](./AUTHENTICATION.md) - dual auth model (`/cabinet/auth/*`, `/crm/auth/*`); **for cookie/mobile and tenant headers prefer [HTTP API Contract](./backend/HTTP_API_CONTRACT.md)**
- [Storage Module](./STORAGE.md) - private/public file storage and member documents

## Current Status

- member cabinet: inside `apps/crm` (TASK-710…715), `apps/web` removed in TASK-721
- `apps/crm`: implemented base shell and member management routes; advanced modules are in progress
- `apps/api`: implemented modular backend (NestJS + Prisma + BullMQ + Redis)

## Core Stack

### Backend

- NestJS 11
- Prisma ORM
- PostgreSQL (via Prisma PostgreSQL adapter)
- Redis
- BullMQ
- JWT auth (separate member/employee contexts)

### Frontend

- Next.js 16 (App Router)
- React 19
- TanStack Query
- Tailwind CSS 4
- next-intl
- OpenAPI-generated API client

## Documentation Rules

- Each area (`site`, `crm`, `backend`) must have one index `README.md`.
- Detailed topics should be split into dedicated module/task files and linked from area README.
- Use explicit labels:
    - **Implemented** for current behavior
    - **Planned** for future scope
- Keep endpoints synchronized with backend source of truth:
    - member web: `/cabinet/auth/*`, mobile: `/cabinet/mobile/auth/*`
    - employee web: `/crm/auth/*`, mobile: `/crm/mobile/auth/*`
    - platform (onboarding): `/platform/portals/*`
