# Аутентификация и права — как с этим работать

Архитектура и решения — [backend/AUTH_ARCHITECTURE.md](backend/AUTH_ARCHITECTURE.md) (схемы, модель
сессий, реестр провайдеров, права). Маршруты и их защита — [backend/AUTH_ROUTES.md](backend/AUTH_ROUTES.md)
(генерируется тестом). Здесь — практическое: как защитить маршрут, добавить способ входа, писать тесты.

## Коротко

- Аккаунт (`User`) один на человека; в клубе он **сотрудник** (`Employee`, CRM) и/или **участник**
  (`Member`, кабинет на `club.`).
- Вход — **сессия** (`auth_sessions`): аккаунт × приложение (`crm` | `cabinet`) × устройство. Access-JWT
  несёт id сессии, гвард проверяет её на каждый запрос — выход, «выйти везде», смена пароля и блокировка
  действуют сразу.
- Веб — только HttpOnly-куки на хосте API: `crm_access`/`cabinet_access`, `crm_refresh`/`cabinet_refresh`
  (путь `/{aud}/auth`), подсказка `crm_session`/`cabinet_session=1` для `proxy.ts` фронтов. Токены в JS не
  попадают. Мобильные клиенты — `/{aud}/mobile/auth/*` и `Authorization: Bearer`.
- Изменяющий запрос с кукой сессии принимается только с наших фронтов (`SessionOriginMiddleware`), тело —
  только JSON.
- Способы входа: пароль, Google (редирект), Telegram (виджет) — реестр провайдеров
  (`modules/portal/auth/identity`), маршруты `/{aud}/auth/{provider}/…`.
- Ссылки из писем — одноразовые `auth_tokens` (хеш, срок, гасятся при использовании).
- Права сотрудника — коды из `modules/portal/crm/access/domain/permissions.ts`, роли клуба редактируемые.

## Защитить маршрут

Каждый маршрут объявляет доступ явно, иначе падает `test/route-auth.e2e-spec.ts`:

| Декоратор | Кто пройдёт |
|---|---|
| `@Public()` | любой (вход, регистрация, публичные ссылки, вебхуки) |
| `@CrmSession()` | вошёл в CRM; клуб не нужен (`/crm/account/*`, `/crm/my-portals`) |
| `@CrmAuth()` | сотрудник клуба из `X-Portal-*` с действующей подпиской клуба |
| `@CrmAuth({ subscription: false })` | то же, но и клубу с истёкшей подпиской (биллинг, сведения) |
| `@CabinetSession()` | вошёл в кабинет; клуб не нужен (`/cabinet/account/*`) |
| `@CabinetAuth()` | участник клуба из `X-Portal-*` |
| `@UseGuards(PlatformJwtAuthGuard)` | платформенный админ (админка) |

Права — `@RequirePermission("members.edit")` на классе или методе (складываются); работает только под
`@CrmAuth` (иначе тест падает). Роль в коде не проверяется — только права. Кто вошёл:
`@CurrentAuthUser()` (аккаунт, сессия, аудитория), `@CurrentEmployee()` / `@CurrentMember()` (после
`MembershipGuard`), `@CurrentPrincipal()` (права).

Маршрут вне клуба в CRM — добавить префикс в `portalContextOptional` (`portal-context.middleware.ts`),
иначе middleware потребует `X-Portal-*`.

## Выдать сессию

Сценарий входа решает, **кого** впустить, а сессию выдаёт `SessionHttpService`:

```ts
await this.sessionHttp.signIn(request, response, {
    userId: user.id,
    audience: SESSION_AUDIENCES.Crm,
    method: "password", // | "google" | "telegram" | "invitation" | "registration" | …
});
```

Мобильный вход — `sessionHttp.issue(...)` (токены в теле, без кук). Завершить сессии —
`SessionsService.endAllForUser(userId, reason, exceptSessionId?)`.

## Ссылка из письма

```ts
const { token } = await authTokens.issue(AUTH_TOKEN_PURPOSES.PasswordReset, { userId });
// … письмо с token …
const result = await authTokens.consume(AUTH_TOKEN_PURPOSES.PasswordReset, token);
// result.kind: "consumed" | "expired" | "invalid"
```

Новая ссылка того же назначения гасит прежнюю; срок — `AUTH_TOKEN_TTL_MS`.

## Новый способ входа

1. Значение в `IDENTITY_PROVIDER_KEYS` и в enum `IdentityProvider` схемы (миграция).
2. Адаптер в `identity/infrastructure/<provider>/`: `RedirectIdentityProvider` (OAuth: адрес и обмен кода)
   или `WidgetIdentityProvider` (проверка подписанного ответа); профиль — `ExternalProfile`.
3. Строка в `IDENTITY_PROVIDERS` (`identity.module.ts`).
4. Адрес возврата у провайдера: `{API_PUBLIC_URL}/{aud}/auth/{provider}/callback`.
5. Фронт: кнопка входа (по `GET /{aud}/auth/providers`) и переводы `account.security.<provider>`.

Маршруты, сессии, привязка/отвязка и «Вход и безопасность» подхватят провайдера сами.

## Фронт

- `proxy.ts` пускает на закрытые страницы по подсказке `*_session`; мёртвую сессию отсекает API (401).
- `@workspace/api-client`: куки (`credentials: include`), на 401 — один refresh на клиента и повтор
  запроса; `refresh_superseded` (соседняя вкладка) — тоже успех.
- «Вход и безопасность» — `widgets/account-security` (CRM: `/{язык}/account/security`, кабинет: `/{язык}/me`).
- Правило пароля — `shared/config/password-policy.ts` (`passwordSchema` для форм).

## Тесты

- Сессия без формы входа: `crmSession(app, userId)` / `cabinetSession(app, userId)` из
  `test/support/sessions.ts` — `cookies` и `refreshCookie` для заголовка `Cookie`.
- Ссылка из письма: хеш — `authLinks(prisma).latestHash(email, LINKS.password)`, токен —
  `mailTokens(mail).fromHash(hash)`.
- Локальный прогон: `TG_BOT_API_KEY=disabled TG_BOT_CHAT_ID=0 TG_CLIENT_BOT_API_KEY=disabled` — иначе API
  шлёт настоящие сообщения в Telegram.
- Матрица маршрутов: `WRITE_AUTH_MATRIX=1 npx jest --config ./test/jest-e2e.json route-auth` (из `apps/api`) обновляет
  `backend/AUTH_ROUTES.md`.

## Переменные окружения

| Переменная | Зачем |
|---|---|
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | подпись access и refresh (разные, обязательны) |
| `JWT_ACCESS_TOKEN_EXPIRES_IN`, `JWT_REFRESH_TOKEN_EXPIRES_IN` | сроки (по умолчанию 15m / 7d) |
| `AUTH_COOKIE_SECURE` | `Secure` у кук (по умолчанию — в проде) |
| `AUTH_HINT_COOKIE_DOMAIN` | домен подсказки `*_session` (`.paf-paf.app`) |
| `CORS_ORIGIN` | фронты: CORS и допустимые источники изменяющих запросов |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | вход через Google |
| `TG_CLIENT_BOT_API_KEY`, `TG_CLIENT_BOT_USERNAME` | Telegram в кабинете |
| `TG_CRM_BOT_API_KEY`, `TG_CRM_BOT_USERNAME` | Telegram в CRM (необязательно) |
| `LOGIN_MAX_FAILURES`, `LOGIN_FAILURE_WINDOW_SECONDS` | лимит неудачных входов по адресу (10 / 900) |
| — | админка платформы — те же `JWT_SECRET` и `JWT_REFRESH_SECRET`, аудитория `platform` |
