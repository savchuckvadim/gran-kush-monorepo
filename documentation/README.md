# Gran Kush Documentation

## Purpose

Unified documentation for the platform split into three product areas:

- **Member Personal Cabinet (LK)** - `apps/web` authenticated member flows
- **CRM for Employees** - `apps/crm` operational interface for staff
- **Backend API** - `apps/api` modules, contracts, storage, queues, auth

## Product Documentation Map

### 1) Member Portal (Site + LK)

- [Site/LK Documentation](./site/README.md)
- Covers public website, member registration, member profile, i18n, frontend architecture

### 2) CRM for Employees

- [CRM Documentation](./crm/README.md)
- Covers current CRM routes, member operations, employee auth integration, and implementation tasks
- [Flexible CRM domain tasks (fields, statuses, settings, inventory, integrations)](./crm/FLEXIBLE_CRM_DOMAIN_TASKS.md) — roadmap: dynamic fields/statuses, portal settings, products, stock ledger, finance snapshots, attendance heatmap, external club site embeds

### 3) Backend

- [Backend Documentation](./backend/README.md)
- [HTTP API Contract](./backend/HTTP_API_CONTRACT.md) — errors, CORS, portal headers (`X-Portal-*`), web cookies vs mobile Bearer
- Covers module architecture, API boundaries, migrations, bootstrap admin seed, and runtime setup

## Cross-Cutting Technical Docs

- [Authentication System](./AUTHENTICATION.md) - dual auth model (`/lk/auth/*`, `/crm/auth/*`); **for cookie/mobile and tenant headers prefer [HTTP API Contract](./backend/HTTP_API_CONTRACT.md)**
- [Storage Module](./STORAGE.md) - private/public file storage and member documents

## Current Status

- `apps/web`: implemented, including member registration and LK auth routes
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
  - member web: `/lk/auth/*`, mobile: `/lk/mobile/auth/*`
  - employee web: `/crm/auth/*`, mobile: `/crm/mobile/auth/*`
  - platform (onboarding): `/platform/portals/*`
