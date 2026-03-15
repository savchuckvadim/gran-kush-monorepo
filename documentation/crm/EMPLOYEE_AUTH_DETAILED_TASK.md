# Employee Authentication Detailed Task

## Goal

Implement production-ready employee authentication/authorization for CRM:
- secure login for employees only
- route and API protection by role
- invitation flow by admin
- admin/non-admin permission model
- auditable and maintainable auth lifecycle

## Scope

This task applies to:
- `apps/api` (auth + employees modules, guards, tokens, invitation flow)
- `apps/crm` (login, protected layout, session handling, RBAC UI behavior)
- `packages/api-client` (OpenAPI regeneration)

## Backend Work (`apps/api`)

## 1) Employee auth contract

- Ensure endpoints exist and are documented:
  - `POST /crm/auth/login`
  - `POST /crm/auth/refresh`
  - `POST /crm/auth/logout`
  - `GET /crm/auth/me`
- Return payload:
  - `accessToken`
  - `refreshToken`
  - `user` (id, email, role, employee profile fields)
  - token metadata (`expiresIn`, optional)

## 2) Token strategy

- Use separate employee token table (already present conceptually).
- Refresh token rotation:
  - issue new refresh token on refresh
  - invalidate previous token
- Revoke all sessions endpoint (optional but recommended).

## 3) Invite-based employee onboarding

- Admin creates invitation:
  - `POST /employees/invitations`
  - payload: email, role (`employee|admin`)
- System sends invite link with one-time token.
- Employee completes setup:
  - `POST /employees/invitations/accept`
  - sets password and profile data
- Invitation constraints:
  - expiration
  - one-time usage
  - audit of inviter, invitee, timestamps

## 4) RBAC rules

- Roles:
  - `employee` (default)
  - `admin`
- Admin-only operations:
  - invite employee
  - change employee role
  - deactivate employee
- Employee and admin operations:
  - view member profile
  - preview member identity documents/signature
  - edit member data (name, contacts, notes, statuses)
  - re-upload member documents/signature
- Recommended finer permissions:
  - `members.read`
  - `members.edit`
  - `members.documents.read`
  - `members.documents.write`
  - `employees.invite`
  - `employees.roles.manage`
- Guard policy:
  - protect sensitive endpoints with `EmployeeJwtAuthGuard` + `AdminGuard`

## 5) Security requirements

- Password hashing via bcrypt (or configured equivalent).
- Rate limit login endpoint.
- Standardized auth error responses (no sensitive details).
- Optional: lockout policy after N failed attempts.
- Document preview endpoints must be private:
  - never expose raw storage path for anonymous users
  - validate employee access on every preview/download request

## 6) Audit logging

Log events:
- employee login success/fail
- refresh/logout
- invitation create/accept/expire
- role change and deactivation

Minimum audit fields:
- actorEmployeeId
- targetEmployeeId
- action
- before/after (for role/status changes)
- timestamp

## 7) OpenAPI and generated client

- Update Swagger schemas for all auth/invite endpoints.
- Regenerate `@workspace/api-client`.
- Ensure typed methods consumed by CRM app only from generated client.

## Frontend Work (`apps/crm`)

## 1) Auth pages and UX

- Keep/implement pages:
  - `/[locale]/auth/login`
  - `/[locale]/auth/invite/accept` (new)
- Login UX:
  - localized validation messages
  - pending/loading state
  - invalid credentials state

## 2) Session management

- Store access token safely (prefer httpOnly cookie if backend supports it).
- Store refresh strategy consistently.
- Add token refresh handler in API client interceptor.
- Auto-logout on refresh failure.

## 3) Route protection

- Protect all `/[locale]/crm/*` routes.
- If unauthenticated:
  - redirect to login.
- If authenticated:
  - allow CRM shell rendering.

## 4) Role-based UI behavior

- Sidebar:
  - show admin-only sections only for admins.
- Employee management screen:
  - non-admin: read-only or hidden.
- Actions:
  - disable or hide admin-only buttons for non-admin users.

## 5) Current employee profile

- Topbar profile uses `/crm/auth/me`.
- Show:
  - name/surname
  - email
  - role badge
  - last login (if available)

## 6) Error handling

- Global handling for:
  - 401 (expired/invalid session)
  - 403 (insufficient permissions)
- Friendly localized error toasts/messages.

## Data/Schema Tasks

- Ensure tables/indexes support:
  - employee tokens (lookup by token + expiry)
  - invitations (token, email, expiry, usedAt)
  - audit logs (action, actor, target, createdAt)

## Non-Functional Requirements

- Full i18n coverage for all new auth screens/messages.
- Type-safe contracts with zero `any` in auth flows.
- Lint/typecheck passing in `api`, `crm`, `api-client`.

## Acceptance Criteria

- Employee can login and access CRM routes.
- Unauthenticated user cannot access CRM protected routes.
- Admin can invite employee and set role.
- Non-admin cannot perform admin actions.
- Refresh token flow keeps session alive without manual relogin.
- Auth and RBAC events are auditable.
