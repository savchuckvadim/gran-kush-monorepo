# CRM Multitenant Auth MVP Contract

## Scope

MVP covers:
- CRM routing in slug mode for known portal: `/{portalSlug}/{locale}/crm/...`
- Auth pages with optional unknown portal entrypoint: `/{locale}/auth/...`
- Browser auth via `HttpOnly` cookies (no frontend token storage)
- Portal onboarding flow: portal signup + root employee account creation

## Routing Contract

- Known portal:
  - `/{portalSlug}/{locale}/auth/login`
  - `/{portalSlug}/{locale}/crm/*`
- Unknown portal:
  - `/{locale}/auth/login`
  - `/{locale}/auth/register`
- After successful login/signup:
  - redirect to `/{portalSlug}/{locale}/crm`

## Auth Contract (Cookie Mode)

- Frontend never reads/writes access or refresh tokens.
- All auth requests include credentials (`credentials: "include"`).
- Backend stores auth state in `HttpOnly` cookies.
- Protected pages rely on `/crm/auth/me` response:
  - `200` => authenticated
  - `401/403` => redirect to login

## API Endpoints for CRM

- `POST /crm/auth/login`
- `POST /crm/auth/refresh`
- `POST /crm/auth/logout`
- `GET /crm/auth/me`

## Portal Onboarding Endpoint

- `POST /platform/portals/register`
- Required payload for MVP:
  - `clubName` (unique slug)
  - `email`
  - `password`
- Expected behavior:
  - create portal
  - create root CRM employee (`portal_owner`)
  - authenticate owner (issue cookies)
  - return `portalSlug` for redirect

## Security Guarantees in MVP

- No localStorage/sessionStorage auth tokens.
- Tenant context required in route for CRM pages.
- Backend must enforce `portalId` match between resolved portal context and authenticated session.
