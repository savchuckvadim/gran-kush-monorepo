# CRM Implementation Plan (Frontend + Backend)

## Goal

Build an internal CRM application (`apps/crm`) with a Bitrix-like layout:
- full-width workspace
- left sidebar navigation
- top navigation/header
- employee profile in top bar
- role-based employee management (admin/non-admin)
- core entities: clients, products, orders
- attendance tracking via QR (entry/exit, time in club, analytics)

This document is a structured backlog and implementation map.

## Product Scope

### Primary CRM Sections

- `Clients`
  - list/search/filter clients
  - open client profile
  - view client orders
  - view client attendance timeline
- `Products`
  - list/search/filter products
  - product card (stock, price, status)
- `Orders`
  - list/search/filter orders
  - order details and status flow
- `Attendance`
  - scan QR at entry/exit
  - current in-club clients
  - stats by period (time in club, visits)
- `Employees` (admin + limited for non-admin)
  - employee list/profile
  - invite employee
  - assign/revoke admin
- `Profile`
  - current employee profile/settings

## What To Remove/Refactor In `apps/crm` (copied from site)

Current CRM was copied from public website. Before feature implementation:

### Remove or de-prioritize website-only pages/widgets

- marketing pages: hero/about/cta/footer/contact public content
- member registration UX from public site (for CRM it is not the core workflow)
- public navigation model (`About`, `Contacts`, etc.)

### Keep and reuse

- i18n setup (`next-intl`)
- theme system (`next-themes`)
- shared UI package (`@workspace/ui`)
- API client package (`@workspace/api-client`)
- auth scaffolding (adapt for employee flow)

### Refactor app shell first

Replace public-site layout with CRM shell:
- fixed left sidebar
- top header
- main content workspace
- responsive collapse for sidebar

## Frontend Tasks (`apps/crm`)

## 1) CRM Shell & Navigation

- Create `modules/widgets/crm-shell`:
  - `crm-sidebar.tsx`
  - `crm-topbar.tsx`
  - `crm-layout.tsx`
- Add route groups:
  - `/[locale]/crm/clients`
  - `/[locale]/crm/products`
  - `/[locale]/crm/orders`
  - `/[locale]/crm/attendance`
  - `/[locale]/crm/employees`
  - `/[locale]/crm/profile`
- Add role-aware menu visibility:
  - admin-only items hidden for non-admin

## 2) Clients

- Clients table page with:
  - search
  - status filters
  - pagination
- Client details page:
  - profile block
  - related orders
  - attendance summary

## 3) Products

- Products table page
- Product details/edit drawer (phase 2)

## 4) Orders

- Orders table page
- Order details page
- Status badge + timeline widget

## 5) Attendance (QR UX)

- `attendance/scan` screen:
  - camera scanner
  - fallback manual code input
- scan result states:
  - success entry
  - success exit
  - invalid/expired token
  - already in-club / not-in-club edge cases
- attendance analytics page:
  - daily/weekly/monthly stats
  - top visitors
  - total time in club

## 6) Employees

- Employees list
- Employee profile
- Invite employee modal/form (admin only)
- Role management action (admin only)

## 7) State/Architecture

- Use FSD-like separation:
  - `pages` for route composition
  - `features` for actions (invite, scan, status update)
  - `entities` (optional next step) for `client/order/product/employee/attendance`
  - `shared` for ui/lib/config
- Use `@workspace/api-client/generated` + TanStack Query

## Backend Tasks (`apps/api`)

## 1) Employee Management (existing module expansion)

- Confirm/extend endpoints for:
  - employee list/details
  - create/invite employee
  - activate/deactivate employee
  - set/unset admin role
- Add strict RBAC checks:
  - only admin can invite or grant admin rights

## 2) Clients/Orders/Products Read APIs

- Provide CRM-ready list/detail endpoints with filters, pagination, sorting:
  - clients
  - orders
  - products
- Include aggregate fields needed by CRM cards/tables

## 3) Attendance + QR Module (new)

Add new module, e.g. `attendance`:

- Entities (suggestion):
  - `AttendanceSession` (`id`, `memberId`, `enteredAt`, `exitedAt`, `durationSec`, `createdByEmployeeId`)
  - `AttendanceQrToken` (`id`, `memberId`, `token`, `expiresAt`, `isUsed`, `purpose`)
- Endpoints:
  - generate QR token (employee/admin use case as required)
  - validate/consume QR scan
  - mark entry
  - mark exit
  - current in-club members
  - attendance stats by period
- Business rules:
  - one active session per member
  - token expiration and replay protection
  - audit trail for who scanned/confirmed

## 4) Security & Audit

- Guard all CRM endpoints with employee auth
- Admin-only guards for employee role changes
- Audit log for sensitive actions:
  - role updates
  - attendance corrections
  - manual session edits

## 5) OpenAPI & Client Regeneration

- Update Swagger/OpenAPI after backend endpoints added
- Regenerate `@workspace/api-client`
- Update CRM hooks/services to generated methods only

## Data/Schema Tasks

- Add Prisma models for attendance and QR tokens
- Add indexes:
  - `AttendanceSession(memberId, enteredAt)`
  - active session lookup (`memberId`, `exitedAt is null`)
  - token lookup (`token`, `expiresAt`)
- Add migrations and seed updates if needed

## Suggested Milestones

## Milestone A (Foundation)

- CRM shell (sidebar + topbar + protected layout)
- clients/products/orders placeholder pages
- employee profile in topbar

## Milestone B (Core Data)

- clients/products/orders list + details via API
- employee list page

## Milestone C (Admin Employees)

- invite employee
- admin/non-admin role assignment
- RBAC UI + backend guards

## Milestone D (Attendance QR)

- QR generation endpoint
- scanner page in CRM
- entry/exit flow
- analytics widgets

## Milestone E (Polish)

- i18n coverage for CRM-specific texts
- loading/error/empty states
- docs updates

## Acceptance Criteria (High Level)

- CRM has full-width dashboard shell with left + top nav.
- Employee can open clients/products/orders sections.
- Admin can invite employees and manage admin rights.
- Attendance via QR works end-to-end (entry/exit + stats).
- All CRM API calls are via generated API client.
- Typecheck/lint pass in modified workspaces.

## Notes for Next Steps

- Start with Milestone A and B first (UI shell + read-only business data).
- Keep QR module decoupled, so scanner logic can later support hardware scanners and mobile camera.
- When ready, split this plan into issue tickets (`frontend`, `backend`, `infra`, `docs`) with estimates.
