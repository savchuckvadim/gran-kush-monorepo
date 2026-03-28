# HTTP API contract (current)

Single reference for **multi-tenant portals**, **auth transport** (cookies vs bearer), **CORS**, and **error JSON** shape. Implementation lives in `apps/api`; CRM consumes it via `@workspace/api-client`.

## Source of truth

- **OpenAPI JSON**: `GET /docs-json` (same host as API)
- **Swagger UI**: `GET /docs`
- **Global errors**: `GlobalExceptionFilter` → `apps/api/src/common/filters/global-exception.filter.ts`

---

## Error responses

All non-validation failures go through the global filter and return a JSON body compatible with:

```ts
interface ApiResponse {
    message: string;
    errors?: string[];
}
```

- **`message`**: human-readable summary (or the thrown exception message).
- **`errors`**: optional list of extra strings (e.g. validation lines).

**Validation (`class-validator` / `BadRequestException`)** is handled separately and returns **HTTP 400** with:

```json
{
    "message": "Validation failed",
    "errors": ["email must be an email", "..."]
}
```

The `errors` field may be a **string array** (each item is one constraint message).

**Client parsing** (CRM / shared packages): prefer `formatApiErrorMessage` / `assertOpenApiOk` from `@workspace/api-client/core` — they prefer **`errors`** when non-empty, otherwise **`message`**.

> **Note:** Older docs sometimes showed `{ success, data }` or nested `error` objects. The **runtime** contract for exceptions is the shape above unless a specific controller returns a different DTO for success.

---

## CORS

Configured in `apps/api/src/common/config/cors/cors.config.ts`.

- **`credentials: true`** — required for cookie-based web auth.
- **`origin`** — comma-separated list from env `CORS_ORIGIN` (each origin trimmed).
- **Allowed headers** include:
  - `Content-Type`, `Authorization`
  - `X-Portal-Id`, `X-Portal-Slug` — portal resolution / tenant context
  - `X-Device-Id` — device binding for auth flows

Frontend apps must use **`fetch(..., { credentials: "include" })`** when calling the API with cookies (see CRM `configureApiClient` with `authStrategy: "cookie"`).

---

## Multi-tenant portal context

- Business principals (**Member**, **Employee**) are scoped to a **portal** (`portalId` on the entity).
- The API can resolve portal context from **headers** (BFF / Next middleware):

| Header        | Role                          |
|---------------|-------------------------------|
| `X-Portal-Id` | Portal UUID (preferred when known) |
| `X-Portal-Slug` | Portal slug (alternative) |

Constants: `apps/api/src/common/portal/portal-http.constants.ts`.

After JWT validation, **`PortalTenantMatchGuard`** ensures the authenticated user’s `portalId` matches the request’s portal context when that context is present. Mismatch → **403** (`ForbiddenException`).

---

## Auth: web (HttpOnly cookies) vs mobile (Bearer)

### Web (browser)

- **CRM**: `EmployeeAuthController` prefix `crm/auth` — login sets **HttpOnly** cookies for access/refresh; refresh reads refresh cookie; logout clears cookies.
- **LK (member)**: `MemberAuthController` prefix `lk/auth` — same idea for member scope.

Cookie **names** and **domain** come from `ConfigCookieService` / env:

- Defaults include `crm_access_token`, `crm_refresh_token`, `member_access_token`, `member_refresh_token`.
- Override via `CRM_ACCESS_COOKIE_NAME`, `CRM_REFRESH_COOKIE_NAME`, `MEMBER_ACCESS_COOKIE_NAME`, `MEMBER_REFRESH_COOKIE_NAME`.
- Cookie **domain** is derived from `CRM_FRONTEND_URL` / `MEMBER_FRONTEND_URL` (see `getDomain(scope)`).

Cookies are **httpOnly**, **SameSite=Lax**, **path=/**, **secure** follows `AUTH_COOKIE_SECURE` / `NODE_ENV`.

### Mobile / non-browser API consumers

Separate controllers avoid relying on cookies:

- **CRM**: `crm/mobile/auth`
- **LK**: `lk/mobile/auth`

These typically return tokens in JSON and use **`Authorization: Bearer`** on subsequent calls.

### JWT strategies

Passport uses **separate strategies** for bearer vs cookie (see `apps/api/src/common/auth/consts/passport-strategy-names.ts` and employee/member `infrastructure/strategies/*`). Guards pick the right strategy for web vs mobile routes.

---

## Platform (onboarding)

- **`POST /platform/portals/register`** — public registration of a new portal (and root owner employee). Used from CRM “create portal” flow before tenant-scoped CRM routes.

---

## Related env (API)

| Variable | Purpose |
|----------|---------|
| `COOKIE_SECRET` | `cookie-parser` signing |
| `CORS_ORIGIN` | Allowed browser origins |
| `CRM_FRONTEND_URL` | CRM cookie domain base |
| `MEMBER_FRONTEND_URL` | LK cookie domain base |
| `JWT_*` | Token signing and TTL |

---

## Related frontend packages

- **`@workspace/api-client`**: `configureApiClient`, `getAuthMiddleware` (refresh retry), `assertOpenApiOk`, `ApiClientError`, `formatApiErrorMessage`.
- **CRM** (`apps/crm/modules/shared/api/api.ts`): `ApiAuthType.CRM`, `authStrategy: "cookie"`, `NEXT_PUBLIC_API_URL`.
