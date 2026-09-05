# HTTP API contract (current)

Single reference for **multi-tenant portals**, **auth transport** (cookies vs bearer), **CORS**, and **error JSON** shape. Implementation lives in `apps/api`; CRM consumes it via `@workspace/api-client`.

## Source of truth

- **OpenAPI JSON**: `GET /docs-json` (same host as API)
- **Swagger UI**: `GET /docs`
- **Global errors**: `GlobalExceptionFilter` → `apps/api/src/common/filters/global-exception.filter.ts`

---

## Error responses

`GlobalExceptionFilter` is registered as `APP_FILTER` in `AppModule`. Every failure — HTTP exceptions, `ValidationPipe`, body-parser errors, unexpected throws — returns:

```ts
interface ApiErrorBody {
    message: string;
    errors: string[]; // always present, empty when there are no details
}
```

- **`message`**: human-readable summary (the thrown exception message, or the Nest default such as `Forbidden`).
- **`errors`**: constraint messages for validation failures, otherwise `[]`.
- Nest's own `statusCode` / `error` fields are **not** emitted. Extra fields of an object exception payload are kept (e.g. `checks` on `GET /health/ready` → 503).

| Case | Status | Body |
|---|---|---|
| DTO validation (`class-validator`) | 400 | `{ "message": "Validation failed", "errors": ["email must be an email", "..."] }` |
| Unknown field in body or query (`forbidNonWhitelisted`) | 400 | `{ "message": "Validation failed", "errors": ["property extra should not exist"] }` |
| Body above the route limit (body-parser) | 413 | `{ "message": "request entity too large", "errors": [] }` |
| Malformed JSON (body-parser) | 400 | `{ "message": "<parser text>", "errors": [] }` |
| Unexpected exception | 500 | `{ "message": "Internal server error", "errors": [] }` — exception text never reaches the client, the stack goes to the log |

**Validation is strict**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` is registered as `APP_PIPE` (`apps/api/src/common/config/validation/validation.config.ts`). Fields missing from the DTO are rejected, not stripped — this applies to query strings too, so list endpoints take **one** `@Query()` DTO (`IntersectionType(PaginationDto, XxxFilterDto)`); two DTOs on the same handler would reject each other's fields.

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
  - `Idempotency-Key` — ключ идемпотентности мутаций (см. ниже)

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

`PortalContextMiddleware` (`apps/api/src/modules/portal/crm/portals/infrastructure/middleware/portal-context.middleware.ts`)
requires portal headers on every `/crm/*`, `/lk/*`, `/users/*`, `/public/*` route and answers
**400** (`Missing portal: send x-portal-id or x-portal-slug`) when they are absent.

Routes listed in its `optionalPrefixes` work without the headers — auth, account, cross-portal
screens, and `/crm/portals/resolve` (used by CRM SSR to resolve the portal from the URL slug).

> **Rule:** an endpoint that is public / used during SSR *before* the portal is known must be added
> to `optionalPrefixes`. Otherwise it is unreachable by design: it needs the portal context in order
> to tell the caller what the portal is.

After JWT validation, **`PortalTenantMatchGuard`** ensures the authenticated user’s `portalId` matches the request’s portal context when that context is present. Mismatch → **403** (`ForbiddenException`).

---

## Rate limiting

Глобальный `ThrottlerGuard` (`APP_GUARD`), наборы лимитов —
`apps/api/src/common/config/throttler/throttler.config.ts`. Лимит считается **на IP**,
превышение → **429**. Все значения переопределяются переменными окружения.

| Набор | По умолчанию | Где применяется | Env |
|---|---|---|---|
| `default` | 300 / мин | всё остальное | `THROTTLE_DEFAULT_LIMIT` |
| `auth` | 20 / мин | логины, refresh, верификация email, подтверждение сброса | `THROTTLE_AUTH_LIMIT` |
| `email` | 5 / мин | всё, что отправляет письмо | `THROTTLE_EMAIL_LIMIT` |
| `public-token` | 30 / мин | `/public/invitations/*`, `/public/reg-links/*` | `THROTTLE_PUBLIC_TOKEN_LIMIT` |
| `signup` | 10 / мин | регистрация участника, сотрудника, портала | `THROTTLE_SIGNUP_LIMIT` |
| `upload` | 20 / мин | загрузка документов и подписи (LK и CRM) | `THROTTLE_UPLOAD_LIMIT` |

### `trust proxy` — обязателен за nginx

`main.ts` выставляет `trust proxy` из **`TRUST_PROXY_HOPS`** (по умолчанию `1`) — это число
прокси перед приложением, а не `true`.

- Без него `req.ip` — адрес контейнера nginx, и лимит считается на всех клиентов сразу:
  один активный пользователь выбивает 429 всему клубу.
- Значение **больше** фактического числа хопов позволяет клиенту подделать свой IP заголовком
  `X-Forwarded-For` и лимит обойти. Поэтому число, а не `true`.
- nginx из `infra/docker/nginx/templates` добавляет ровно один хоп → `1`. Если приложение
  смотрит в интернет напрямую, ставьте `0`.

---

## Загрузка файлов

Файлы аккаунта (удостоверение личности, подпись) принимаются тремя маршрутами и всегда
проходят через `AccountFilesService` (`apps/api/src/modules/account`):

| Маршрут | Формат | Кто |
|---|---|---|
| `POST /lk/account/documents`, `PUT /lk/account/signature` | base64 data URL в JSON | участник |
| `POST /lk/auth/member/files` | base64 data URL в JSON → очередь `member-files` | участник при регистрации |
| `PATCH /crm/members/:id/files` | multipart | admin клуба |

**Тип — по содержимому.** Заявленный клиентом MIME (префикс data URL, `Content-Type` части
multipart) не имеет значения: тип определяется по сигнатуре байтов (`common/upload`).
Документ — JPEG, PNG, WebP или PDF; подпись — только изображение. Иное → **400**
`… file type is not supported`.

**Лимиты** (`common/upload/upload.config.ts`, переопределяются окружением):

| Что | По умолчанию | Env |
|---|---|---|
| Документ | 8 МБ | `UPLOAD_MAX_DOCUMENT_MB` |
| Подпись | 2 МБ | `UPLOAD_MAX_SIGNATURE_MB` |
| Документов на аккаунт (пар тип × сторона) | 10 | `UPLOAD_MAX_DOCUMENTS_PER_ACCOUNT` |
| JSON-тело на маршрутах загрузки | 25 МБ (считается от лимитов выше) | — |
| JSON-тело везде остальное | 1 МБ | `JSON_BODY_LIMIT` |

Превышение лимита файла → **400** с причиной; превышение потолка тела → **413** от парсера
(до контроллера). `client_max_body_size` в nginx (`infra/`) должен быть не меньше потолка
маршрутов загрузки — сейчас оба 25 МБ.

Замена документа или подписи удаляет прежний объект из бакета; `DELETE /lk/account/documents/:id`
удаляет и строку, и объект. Превью в CRM отдаются с `Cache-Control: private, no-store` и
`X-Content-Type-Options: nosniff`.

---

## Idempotency-Key

Повтор одного и того же POST не должен создавать вторую сущность. Клиент присылает
`Idempotency-Key`, сервер занимает ключ до выполнения и сохраняет ответ после — повтор
возвращает сохранённое вместо второго выполнения.

**Заголовок опционален.** Без него маршрут работает как раньше; `@workspace/api-client`
проставляет ключ на все `POST`/`PUT`/`PATCH` автоматически.

Защищённые маршруты помечены декоратором `@Idempotent(scope)`
(`apps/api/src/common/idempotency`) и видны в Swagger по заголовку `idempotency-key`:

| Маршрут | Scope |
|---|---|
| `POST /lk/orders` | `lk.orders.create` |
| `POST /crm/finance/transactions` | `crm.finance.transactions.create` |

| Ситуация | Ответ |
|---|---|
| Ключ прислан впервые | запрос выполняется, ответ сохраняется |
| Повтор с тем же телом | сохранённый ответ, эффекты не применяются повторно |
| Тот же ключ с другим телом | **422** — ошибка клиента, а не повтор |
| Ключ занят незавершённым запросом | **409** — перечитать результат, а не создавать второй |
| Запрос завершился ошибкой | ключ снимается: осмысленный ретрай пройдёт |
| Ключ длиннее 255 символов | **400** |

**Ключ уникален в пределах владельца**, а не глобально: адрес строки —
`(scope, "<portalId>:<principalType>:<membershipId>", key)`. Совпадение клиентских ключей
у двух клубов не отдаёт одному ответ другого. Маршрут без аутентификации помечать
`@Idempotent` нельзя — владельца ключа нет, и интерцептор отвечает 500 fail-closed.

Ключи живут 24 часа; протухшие снимает `IdempotencyCronService`. Ошибки не кэшируются
намеренно — иначе первый же сетевой сбой навсегда занял бы ключ.

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
| `TRUST_PROXY_HOPS` | Число прокси перед API (за nginx из `infra/` — `1`, напрямую — `0`) |
| `THROTTLE_DEFAULT_LIMIT` | Общий лимит запросов на IP в минуту (300) |
| `THROTTLE_AUTH_LIMIT` | Лимит на логины и refresh (20) |
| `THROTTLE_EMAIL_LIMIT` | Лимит на маршруты, отправляющие письма (5) |
| `THROTTLE_PUBLIC_TOKEN_LIMIT` | Лимит на публичные токен-маршруты (30) |
| `THROTTLE_SIGNUP_LIMIT` | Лимит на регистрации (10) |
| `THROTTLE_UPLOAD_LIMIT` | Лимит на загрузку файлов (20) |
| `UPLOAD_MAX_DOCUMENT_MB` | Потолок файла документа в МБ (8) |
| `UPLOAD_MAX_SIGNATURE_MB` | Потолок файла подписи в МБ (2) |
| `UPLOAD_MAX_DOCUMENTS_PER_ACCOUNT` | Сколько документов может держать один аккаунт (10) |
| `JSON_BODY_LIMIT` | Потолок JSON-тела вне маршрутов загрузки (`1mb`) |

---

## Related frontend packages

- **`@workspace/api-client`**: `configureApiClient`, `getAuthMiddleware` (refresh retry), `assertOpenApiOk`, `ApiClientError`, `formatApiErrorMessage`.
- **CRM** (`apps/crm/modules/shared/api/api.ts`): `ApiAuthType.CRM`, `authStrategy: "cookie"`, `NEXT_PUBLIC_API_URL`.
