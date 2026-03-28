# CRM Documentation

## Purpose

CRM (`apps/crm`) is the internal application for employees:

- view and manage members
- inspect uploaded documents/signatures
- update member profile/status data
- work with employee-authenticated flows

## Multi-tenant routing

CRM is **portal-scoped**: after a portal exists, the app lives under a **`[portal]`** segment (slug).

- **Landing / onboarding (no portal yet)**  
  - `/{locale}/` — entry  
  - `/{locale}/auth/login`, `/{locale}/auth/register`, `/{locale}/auth/confirm-email` — flows before a tenant slug is fixed

- **Inside a portal (tenant)**  
  - `/{locale}/{portal}/crm/...` — main CRM shell (members, products, attendance, etc.)  
  - `/{locale}/{portal}/auth/login`, `register`, `confirm-email` — auth in tenant context

The API resolves **portal** via **`X-Portal-Id`** / **`X-Portal-Slug`** (forwarded by middleware/BFF as configured). See [Backend HTTP API Contract](../backend/HTTP_API_CONTRACT.md).

**Platform registration** (create portal + owner): `POST /platform/portals/register` — used from the global registration flow; successful response returns portal identifiers so the client can navigate to `/{locale}/{slug}/crm/...`.

## Current Status

### Implemented

- CRM shell layout (sidebar + topbar)
- Localized routes (`ru`, `en`, `es`)
- Employee auth pages (global and under `[portal]`)
- Member list and member details routes (under `[portal]/crm/...`)
- Member document routes:
  - thumbnails on profile
  - document list page
  - single document preview page
- Member profile editing and re-upload flow for documents/signature

### In Progress / Planned

- Strict FSD cleanup completion
- Full employee RBAC enforcement in frontend routes
- Campaigns / analytics / advanced employee management

## Route map (representative)

**With portal slug** (typical logged-in CRM):

- `/{locale}/{portal}/crm`
- `/{locale}/{portal}/crm/members`
- `/{locale}/{portal}/crm/members/{memberId}`
- `/{locale}/{portal}/crm/members/{memberId}/documents`
- `/{locale}/{portal}/crm/members/{memberId}/documents/{documentId}`
- `/{locale}/{portal}/crm/products`
- `/{locale}/{portal}/crm/orders`
- `/{locale}/{portal}/crm/attendance`
- `/{locale}/{portal}/crm/employees`
- `/{locale}/{portal}/crm/profile`
- `/{locale}/{portal}/scan` — QR / presence (if enabled)

**Before portal** (onboarding):

- `/{locale}/auth/register` — create portal (then redirect into `/{locale}/{slug}/crm`)

## API and auth integration

### Backend endpoints (employee / CRM)

- **Web session (HttpOnly cookies)** — same-origin browser calls with `credentials: "include"`:
  - `POST /crm/auth/login`
  - `POST /crm/auth/refresh`
  - `POST /crm/auth/logout`
  - `GET /crm/auth/me`

- **Mobile / Bearer** (not used by default CRM web client): `crm/mobile/auth/*`

- **Member management** (employee JWT + portal context): e.g. `GET/PATCH /crm/members...` — exact paths in OpenAPI (`/docs-json`).

### Environment

- **`NEXT_PUBLIC_API_URL`** — base URL of `apps/api` (used by `apps/crm/modules/shared/api/api.ts`).

### API client (`@workspace/api-client`)

- **`configureApiClient(baseUrl, ApiAuthType.CRM, { authStrategy: "cookie" })`** — all requests use `fetch` with **`credentials: "include"`** so HttpOnly auth cookies are sent.
- **`getAuthMiddleware`** — handles **401 → refresh → retry**; does not replace domain-level error UX (toasts/forms); use helpers below for user-visible messages.
- **Errors** — `assertOpenApiOk(result)` throws **`ApiClientError`** with a message derived from the JSON body (`errors` preferred over `message`). **`getApiErrorMessage(error)`** unwraps for UI.
- **CRM UI helpers** — `notifyApiError` (`apps/crm/modules/shared/lib/notify-api-error.ts`) shows a **Sonner** toast; forms can also show **`getApiErrorMessage(mutation.error)`** inline (better for mobile if toasts are disabled later).

OpenAPI-generated types in **`packages/api-client`** are the source of truth for request/response shapes.

## Architecture notes

- Target frontend architecture is strict FSD.
- Entity-level member APIs and models should live in `entities/member`.
- Route pages should be thin composition layers.
- Feature logic should stay in `features/*`.

## Documentation map

- [CRM Implementation Plan](./CRM_IMPLEMENTATION_PLAN.md)
- [Flexible CRM domain tasks](./FLEXIBLE_CRM_DOMAIN_TASKS.md) — поля, статусы, настройки портала/CRM, товары и склад, финансы, посещаемость, интеграция с сайтом клуба (backend + CRM UI)
- [Employee Authentication Detailed Task](./EMPLOYEE_AUTH_DETAILED_TASK.md)
- [Strict FSD Refactor Plan](./FSD_STRICT_REFACTOR_PLAN.md)
- [Multi-tenant micro-SaaS plan](./MULTI_TENANT_MICROSAAS_PLAN.md) — в т.ч. §8 Dynamic Fields (база для Epic B)

## Related documentation

- [Backend README](../backend/README.md)
- [HTTP API Contract](../backend/HTTP_API_CONTRACT.md) — errors, CORS, portal headers, cookies
- [Authentication System](../AUTHENTICATION.md) — long-form narrative (verify against contract for cookie/mobile split)
- [Storage Module](../STORAGE.md)
- [Site + LK Documentation](../site/README.md)