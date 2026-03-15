# CRM Strict FSD Refactor Plan

## Objective

Refactor `apps/crm` to strict FSD and remove leftovers copied from `apps/web`.

Key constraints:
- keep only CRM-relevant slices
- move member data access from `shared/lib/crm-members.ts` into `entities/member`
- use only `@workspace/api-client/generated` for API calls and typings
- remove axios-only layer (`shared/lib/api.ts`) unless explicitly needed for non-generated endpoints

## Current Audit (What is wrong now)

## 1) Web leftovers still present in CRM

Unused or obsolete (copied from web):
- `modules/widgets/footer/*`
- `modules/widgets/header/*`
- `modules/widgets/navigation/*`
- `modules/widgets/hero-section/*`
- `modules/widgets/cta-section/*`
- i18n namespaces not used by CRM shell/pages:
  - `home.json`
  - `contacts.json`
  - `about-us.json`

Only active widget for current CRM flow:
- `modules/widgets/crm-shell/crm-shell.tsx`

## 2) Wrong FSD layer for member API

Current:
- `modules/shared/lib/crm-members.ts`

Issue:
- Business entity-specific API and types are in `shared`.  
- In strict FSD, this belongs to `entities/member`.

## 3) API access mismatch

Current:
- member calls use manual `fetch` in `shared/lib/crm-members.ts`
- auth login still uses axios client from `shared/lib/api.ts`

Target:
- use generated services from `@workspace/api-client/generated` everywhere
- keep one OpenAPI config point for auth headers, credentials, refresh strategy

## 4) Auth/refresh architecture unresolved

With `openapi-typescript-codegen --client fetch`, there are no axios interceptors.
You need token lifecycle at app level (wrapper/composable), not axios interceptors.

---

## Target Strict FSD Structure

Recommended CRM structure:

```text
apps/crm/modules/
  app/                          # optional app-level providers/wiring
  pages/
    crm-members/                # route composition (list/details/documents)
  widgets/
    crm-shell/
  features/
    auth/
      employee-login/
      employee-logout/
      token-refresh/
    member/
      edit-member-profile/
      reupload-member-files/
      member-document-preview/
  entities/
    member/
      api/
        member.queries.ts
        member.mutations.ts
      model/
        member.types.ts
      ui/
        member-badges.tsx
        member-documents-grid.tsx
    employee/
      api/
      model/
  shared/
    config/
      i18n/
      routes.ts
    lib/
      openapi/
        configure-openapi.ts
        auth-session.ts
      use-localized-link.ts
    providers/
```

Rules:
- `entities/*` = entity data contracts + low-level typed data access + entity UI atoms.
- `features/*` = use-cases/actions (edit profile, upload files, login).
- `widgets/*` = composed blocks (shell).
- `pages/*` = page composition only.
- `shared/*` = only generic cross-entity things.

---

## Exact Refactor Steps

## Phase 1 — Cleanup web leftovers

Delete candidates (after confirming zero imports):
- `modules/widgets/footer/**`
- `modules/widgets/header/**`
- `modules/widgets/navigation/**`
- `modules/widgets/hero-section/**`
- `modules/widgets/cta-section/**`

Then simplify:
- `shared/config/routes.ts` remove non-CRM routes (`ABOUT`, `CONTACTS`, etc.) if no auth pages depend on them.
- `i18n.ts` load only namespaces actually used by CRM:
  - `common`, `auth`, `navigation` (if needed), `profile` (if needed), `crm`
- remove unused message files for each locale:
  - `home.json`, `contacts.json`, `about-us.json` (if truly unused after cleanup)

## Phase 2 — Move member domain to entities

Move:
- `modules/shared/lib/crm-members.ts` -> `modules/entities/member/api/member.api.ts`

Split:
- `model/member.types.ts` for UI-level types (if extra mapping is needed)
- keep raw generated DTOs when possible to avoid duplication

Update imports in:
- `app/[locale]/crm/members/*`
- `features/members/member-profile-editor.tsx`

## Phase 3 — Migrate all API calls to generated client

Replace manual fetch + axios with:
- `EmployeeAuthenticationCrmService`
- `Member* services` from generated package (or new generated endpoints)

For temporary CRM member endpoints (`/crm/members*`):
- either add them to OpenAPI and regenerate client
- or keep a temporary typed adapter in `entities/member/api` marked as temporary

Remove when migration completed:
- `modules/shared/lib/api.ts`
- `axios` from `apps/crm/package.json`
- `shared/lib/index.ts` exports for removed API layer

## Phase 4 — Strict feature boundaries

Create feature slices:
- `features/member/edit-member-profile`
- `features/member/reupload-member-files`
- `features/member/open-document-preview`

Page files should only compose:
- `entities` components + `features` components.

## Phase 5 — Final dead-code sweep

Run:
- import graph search for old paths
- remove unused locales keys from `navigation` and `common` if obsolete
- ensure no references to removed widget folders

---

## Fetch Client Refresh Strategy (without axios interceptors)

## Recommended approach

Use OpenAPI config + a request wrapper:

1. Configure once (client side/provider):
- `OpenAPI.BASE = NEXT_PUBLIC_API_URL`
- `OpenAPI.WITH_CREDENTIALS = true` (if refresh token in httpOnly cookie)
- `OpenAPI.CREDENTIALS = "include"`
- `OpenAPI.TOKEN = async () => getAccessTokenFromStore()`

2. Wrap calls:
- `callWithRefresh(() => SomeService.someMethod(...))`
- on 401:
  - call `EmployeeAuthenticationCrmService.employeeAuthRefresh()`
  - update access token in store
  - retry original call once
  - if refresh fails -> clear session + redirect login

3. Centralize in `shared/lib/openapi/auth-session.ts`

Benefits:
- works with generated fetch client
- no axios interceptors required
- explicit retry policy

## Alternative

Fork generated `request.ts` and inject retry logic there.  
Not recommended for now (regeneration conflicts).

---

## Suggested Concrete Tasks (Execution Backlog)

1. **Delete web leftovers** (widgets + unused routes/messages)
2. **Create `entities/member`** and move `crm-members` logic
3. **Introduce OpenAPI session layer** (`configure-openapi.ts`, `auth-session.ts`)
4. **Migrate login to generated employee auth service**
5. **Migrate member read/edit/upload calls to generated services**
6. **Remove axios layer and dependency**
7. **Run lint/typecheck and update docs**

---

## Definition of Done

- No obsolete web widgets/files left in CRM.
- No entity API in `shared/lib`.
- `shared/lib/api.ts` removed.
- CRM uses generated API client + typed DTOs.
- Refresh flow works via OpenAPI wrapper.
- `crm` builds/typechecks cleanly.
