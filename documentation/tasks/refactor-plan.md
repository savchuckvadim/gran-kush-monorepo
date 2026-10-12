# План рефакторинга: системный и по модулям (TASK-660)

Дата: 2026-10-12. Ветка `main`, HEAD `dd14f41` (после слияния TASK-6xx из
[crm-polish](crm-polish.md)). Источник — три аудита кода 12.10.2026: API (`apps/api`), CRM
(`apps/crm` + `packages/ui`, `packages/api-client`) и безопасность (вынесена в
[security-audit](security-audit.md), раздел TASK-66x). Проверялось против правил корневого
`CLAUDE.md` и [MODULE_DEVELOPMENT_PRINCIPLES](../backend/MODULE_DEVELOPMENT_PRINCIPLES.md).

Легенда статусов — как в [pafpaf-launch](pafpaf-launch.md): `[ ]` не начато, `[~]` частично,
`[x]` сделано. Оценка: **S** — до полудня, **M** — 1–2 дня, **L** — 3+ дня. Приоритет: **P0** —
баг или дыра, чинить до следующего релиза; **P1** — мешает каждой следующей фиче; **P2** — гигиена.

Смежное: [flexible-entities-audit](flexible-entities-audit.md) (EAV), [multitenant](multitenant.md),
[scaling-roadmap](scaling-roadmap.md), [crm/README](../crm/README.md) (FSD).

---

## Как рефакторим

- Одна ветка — одна тема из этого плана, без смены поведения; что меняет контракт API —
  с регенерацией `packages/api-client` и правкой фронтов в той же ветке.
- Сначала тест, потом перенос: там, где покрытия нет (entity-fields, invitations, processors),
  рефакторинг начинается с e2e или unit-спеки на текущее поведение.
- Правила, которые сейчас никто не проверяет, после рефакторинга включаются в линтер:
  `noImplicitAny` и `no-explicit-any: error` в API (сейчас выключены — `apps/api/tsconfig.json`,
  `eslint.config.mjs:33`), границы слоёв FSD в CRM (плагин `eslint-plugin-boundaries`).
- Порядок: сначала **баги из аудита** (раздел «Чинить сразу»), затем P1 по модулям, P2 — по мере
  касания кода.

---

## Чинить сразу (баги, найденные аудитом) — P0

| #   | Где                                                                                                                                            | Что                                                                                                                                                                                                                     | Оценка |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| B1  | `apps/crm/modules/entities/member/api/member.api.ts:51-66`, `member-documents.api.ts:91-95`                                                    | Три записи участника не проверяют ответ: 4xx/5xx считаются успехом, UI показывает «сохранено». То же — `select: r => r.data as` в `portal-switcher.tsx:30`, `member-status-items.hook.ts:28`                            | S      |
| B2  | `apps/crm/modules/widgets/portal-switcher/portal-switcher.tsx:49`, `shared/providers/providers.tsx:17`                                         | Смена клуба — `router.push` без сброса кеша TanStack; только 3 ключа запросов включают слаг портала, `staleTime` 60 с (5 мин у текущего пользователя) → после переключения 1–5 минут видны списки и роль прошлого клуба | S      |
| B3  | `apps/api/.../catalog/infrastructure/repositories/product-prisma.repository.ts:56`, `common/paginate/dto/pagination.dto.ts`                    | `sortBy` — свободная строка прямо в `orderBy: {[sortBy]: …}` → любой чужой ключ даёт 500 на списке товаров                                                                                                              | S      |
| B4  | `qr-code-prisma.repository.ts:24` (`entityRecordIdForMember`)                                                                                  | Поиск записи участника без `portalId`; в `presence-session-prisma.repository.ts:24` скоуп необязательный. Закрыть обязательным `portalId` (см. TASK-66x в security-audit)                                               | S      |
| B5  | `POST /lk/auth/member/check` (`member-registration.controller.ts`)                                                                             | Без троттлинга, отвечает «пользователь есть/нет» — перебор email. Фронтами не используется — удалить                                                                                                                    | S      |
| B6  | `product-prisma.repository.ts:161`, `order-prisma.repository.ts:279`, `financial-transaction-prisma.repository.ts:341`                         | `contains` без экранирования `%`/`_`: ввод «50%» ищет не то. Общий `textSearch()` (R8)                                                                                                                                  | S      |
| B7  | `storage.service.ts:71-74,86`, `common/s3/s3.service.ts:48`, `employee-auth.service.ts:79`, `member-auth.service.ts:76`, `mail.service.ts:245` | Проглоченные ошибки: любая ошибка хранилища → 404, падение БД при логине → 401, ошибка почты → `false` без лога                                                                                                         | S      |
| B8  | `apps/crm/app/[locale]/[portal]/layout.tsx:19-25`                                                                                              | Сырой `fetch('/crm/portals/resolve?slug=' + portal)` без `encodeURIComponent` и без типизированного клиента                                                                                                             | S      |
| B9  | `features/employees/registration/register-employee-form.tsx`                                                                                   | После добавления сотрудника список не инвалидируется (ключ не экспортирован) — новый сотрудник появляется через минуту                                                                                                  | S      |
| B10 | `join-portal.service.ts:60-71`                                                                                                                 | Несколько записей без транзакции: при падении посередине остаётся участник без значений полей                                                                                                                           | S      |

---

## A. Общесистемное — API

### R1. Prisma только в infrastructure `[ ]` P1 · L (по частям)

Факт: 22 класса application-слоя и 8 контроллеров инжектят `PrismaService`; Prisma-типы
в application/domain — `registration-links.service.ts:46,129,302`, `entity-records.service.ts:90,364`,
`portal-field-settings.service.ts:16`, `order-stages.service.ts:8`,
`provision-portal-from-templates.service.ts:10,21`, `field-values.service.ts:81`,
`billing-cron.service.ts:48-86`, `payments.service.ts:8-49`, `products.service.ts:98-179`
(13× `Prisma.Decimal`), `orders.service.ts:46,384`; в domain — `member.entity.ts:36-38`,
`refresh-token-repository.interface.ts:3`, `user-document-repository.interface.ts:18`.
Контроллеры с Prisma: `lk-reviews`, `crm-portal-settings:42`, `lk-spending:28-66`,
`public-portals:27-62`, `lk-portals:33`, `crm-my-portals:25`, `platform-portals:16-34`
(сырые сущности без DTO, `null` вместо 404), `platform-reference-data:28`.

Что делать, по порядку ценности:

1. `portal/public` и `portals` — сервис + репозиторий, DTO у `platform-portals`, 404 вместо
   `null`, e2e на публичные маршруты (сейчас их нет).
2. Репозитории для `entity-fields` (сейчас 10 сервисов на Prisma и ни одного интерфейса):
   `EntityDefinitionRepository.requireByCode(portalId, code)` вместо ~18 ручных поисков по
   `portalId_code`; `StatusSetRepository`/`StageRepository` с `defaultStage` (копии в
   `order-prisma.repository.ts:243-259` и `entity-records.service.ts:465-476`); `FieldValueRepository`.
   Константы для ключей жизненного цикла (`"member_lifecycle"` ×3: `form-schema.service.ts:169`,
   `join-portal.service.ts:90`, `members.service.ts:276`). Сначала спеки.
3. Алиасы типов `Money`/`JsonValue` в domain вместо `Prisma.Decimal`/`Prisma.JsonValue`
   (`products.service`, `entity-fields-settings-response.dto.ts:72-184`).
4. `payments.service` и `billing-cron` — это репозитории: перенести SQL в `billing/infrastructure`.
5. 16 application-сервисов импортируют `api/dto` (24 импорта); `PORTAL_SUMMARY_SELECT` из
   infrastructure тянут `invitations.service:15`, `registration-links.service:25` и 3 контроллера —
   ввести доменные типы-«виды» (`PortalSummary`) и мапперы в api.
6. Только после 1–5 — включить `noImplicitAny` и `no-explicit-any: error` (сейчас `any` живёт в
   `common/s3/s3.service.ts:17`, `orders.service.ts:201`).

### R2. Близнецы auth сотрудника и участника `[ ]` P1 · L

`employee-auth.*` и `member-auth.*` (web + mobile контроллеры, сервисы, стратегии, гварды) совпадают
на 85–95 %; конфиг `JwtModule` скопирован трижды (`platform.module.ts:20`,
`employee-auth.module.ts:36`, `member-auth.module.ts:35`); подтверждение почты и сброс пароля живут
в 3–4 местах (`email-verification.controller.ts`, `employee-auth.controller.ts:153-192`,
`member-auth.controller.ts:152-179`, `member-registration.controller.ts:118-129`); `@Req()` для
cookie в `employee-auth.controller.ts:87-118` и `member-auth.controller.ts:84-115`.

Что делать: один набор контроллер/сервис/стратегия, параметризованный областью
(`employee | member`) и именами cookie; один `JwtModule`; декораторы `@RefreshTokenCookie()`,
`@DeviceId()`, `@OptionalPortalId()` вместо `@Req()`; удалить неиспользуемый
`/auth/*` (EmailVerificationController) и `/lk/auth/member/check` (B5). Покрытие уже есть:
`auth-sessions`, `crm-email-auth`, `crm-rbac`, `tenant-isolation` — рефакторить под зелёными e2e.

### R3. Один `MemberSummary` и доступ к записи участника `[ ]` P1 · M

Имя участника из EAV собирается в 7 местах (`financial-transaction-prisma.repository.ts:380`,
`order-prisma.repository.ts:340,358`, `presence-session-prisma.repository.ts:282`,
`qr-code-prisma.repository.ts:106`, `crm-search-prisma.repository.ts:38`, `members.service.ts:75,98`).
Сделать `toMemberSummary()` в `members/domain` и
`MemberRepository.requireEntityRecordId(memberId, portalId)` с обязательным `portalId` (закрывает B4).

### R4. Валидация входа `[ ]` P1 · M

- `FormSchemaQueryDto` вместо `@Query("purpose")` с ручной проверкой enum
  (`crm-members.controller.ts:113`, `crm-employees.controller.ts:82`, третья копия —
  `crm-entity-fields-settings.controller.ts:66`); `PortalSlugQueryDto` для `portal-resolve.controller.ts:24`.
- `sortBy` — `@IsIn([...])` на каждый список (B3); пока presence единственный с белым списком (`:263`).
- Мобильный refresh: токен в `refresh-token.dto.ts` обязателен (сейчас optional и ручная проверка
  в `employee-mobile-auth.controller.ts:64` и копии).
- `@RequireAdmin()` вместо ручной пары `@UseGuards(AdminGuard) @Admin()` (19 мест);
  `CurrentEmployee` определён дважды — оставить один.
- `ParseUUIDPipe` на path-параметры (сейчас только `platform-admin-billing.controller.ts:94,105`).

### R5. Пагинация и поиск — одна реализация `[ ]` P1 · M

- Блок «распаковать page/limit, посчитать skip, собрать PaginatedResult» скопирован в 8
  контроллеров (`crm-catalog:79`, `crm-employees:61`, `crm-members:90`, `crm-presence:132`,
  `crm-finance`, `crm-orders`, `lk-orders`, `lk-presence`), в `registration-links.service.ts:128`
  он в сервисе; `entity-records` ходит по `limit/skip`; размеры страниц по умолчанию 10/20/50.
  Сделать `paginate(query, (take, skip) => repo.findPage(...))` в `common/paginate`, перевести
  `entity-records` на `page/limit` (ломает контракт — с регенерацией api-client и правкой
  `entities/entity-records/api.ts` в CRM).
- Поиск по тексту — три реализации (`crm-search-prisma.repository.ts:47-75` сырой SQL со своим
  экранированием `:27`, `member.repository.ts:62-67`, `entity-record-filter.builder.ts:51-63`).
  Общий `textSearch()` (экранирование `%_\`, разбиение на слова) в `common/prisma`, им же
  закрыть B6.

### R6. Контракт ошибок `[ ]` P2 · M

- 27 сообщений исключений по-русски (orders, finance, qr-codes, presence) при остальных английских —
  единый язык (английский) или ключи для i18n на фронте.
- `throw new Error` в репозиториях превращает ошибку клиента в 500
  (`financial-transaction-prisma.repository.ts:283,296`, `order-prisma.repository.ts:102`);
  HTTP-исключения из infrastructure (`qr-code-prisma.repository.ts:30`,
  `presence-session-prisma.repository.ts:30`, `employee.repository.ts`) — доменные ошибки,
  маппинг в api.
- `isUniqueViolation(e) → ConflictError` в `common/prisma` вместо 4 копий проверки P2002
  (`entity-definitions.service.ts:145`, `portal-field-settings.service.ts:196`,
  `orders.service.ts:46`, `presence-session-prisma.repository.ts:144`).
- Проверка QR отвечает 200 `{valid: false}` (`qr-codes.service.ts:159-223`) — договориться о коде.
- `console.*` → `Logger` (`storage.service.ts:72,87`, `common/s3/s3.service.ts:29-49`,
  `common/config/swagger/swagger.config.ts:44-62`); `Promise<unknown>` у трёх хендлеров
  (`member-registration.controller.ts:56`, `crm-employees.controller.ts:84`,
  `crm-members.controller.ts:115`) — типизировать.

### R7. Мёртвый код и наследие API `[ ]` P2 · S

Удалить: DTO-копии в `crm/employees/api/dto/{employee-auth-response, employee-login,
employee-logout-response, employee-me-response, employee-refresh-token-response,
register-employee}.dto.ts`, `crm/members/api/dto/{check-user-exists, check-user-exists-response,
register-member-response}.dto.ts`, `portal/auth/api/dto/refresh-token-response.dto.ts`;
`users/application/services/users.service.ts` с тремя DTO и спекой; `user-registered.event.ts`,
`user-errors.const.ts`; шаблоны писем `restriction-lifted` и `test`; 10 пустых `index.ts`;
`common/decorators/auth/{current-user, current-member, current-portal-context}`;
`src/generated/prisma` (20 файлов в git, не импортируются); Nest-«Hello»; 14 неиспользуемых
алиасов tsconfig/jest (`@shared` смотрит в несуществующую папку); скрипт `prisma:push`
(`package.json:28` — `db push` запрещён на staging/prod); `lk/reviews` и `crm/settings/portal`
(фронтами не используются, `averageRating: null` захардкожен); второй путь создания сотрудника
`/crm/auth/employee/register` (цепочка controller → UseCase → Service → EmployeesService без
логики; оставить `crm-employees.controller.ts:96-119`, переключить `apps/crm`).
Переименовать `verifiaction-email.ts`; убрать логирование общего счётчика в
`presence-cron.service.ts:56-72`.

Наследие, которое стоит отдельного решения: DTO отдают `name`/`surname`, а ключи EAV —
`first_name`/`last_name`; `User.isActive` на деле «почта подтверждена» и дублирует
`emailConfirmed`/`status`.

### R8. Тесты API `[ ]` P1 · L (по частям)

Юнит-спек 24 (в т. ч. на мёртвый `users.service`), e2e 16. Без тестов: **invitations** (вообще),
`portal/public`, все 3 процессора BullMQ, `encryption.service`, проверка QR (только изоляция),
presence service и cron, storage/S3, Stripe verifier/provider/sync (только через e2e),
сервисы entity-fields, auth-сервисы и стратегии, platform, catalog, join-portal.
Порядок: invitations e2e → entity-fields unit (перед R1.2) → processors unit с моками очередей →
presence e2e → QR.

---

## B. Общесистемное — CRM и пакеты

### R9. Ответы API: `assertOpenApiOk` везде `[ ]` P0/P1 · M

104 вызова `$api.*` в 29 файлах, `assertOpenApiOk` только в 12; 46 мест с
`if (!response.response.ok) throw new Error("Failed…")` теряют сообщение сервера (presence — 8,
finance — 6). `employee.api.ts:35-83` — 8 `as never` и 4 `as unknown as`, обоснование в
комментарии устарело (эндпоинты уже в схеме). `(error as {status?})` ×4 — заменить на
`instanceof ApiClientError`. Сюда же B1 и B8.

### R10. Ключи запросов и кеш по клубу `[ ]` P0/P1 · M

Именование вразнобой (`memberKeys` / `ORDER_KEYS` / `linkKeys`), литеральные ключи
(`["products"]` в `category.hook.ts:44,56,67`, `measurement-unit.hook.ts:34,46`; `["qr-code", id]`
×3; 7 inline-ключей в auth, portal-switcher, command-palette, invite/join). Одна фабрика ключей на
сущность, экспортируемая из `entities/*`; слаг портала — в корне каждого ключа **или**
`queryClient.clear()` при смене клуба (B2). `useCurrentUser` и `me-employee.hook` — один хук.
`id!` в `order.hook.ts:31`, `product.hook.ts:35`, `finance.hook.ts:36` → `skipToken`.

### R11. FSD: слои и thin pages `[ ]` P1 · M

- 13 импортов «вверх» в `processes` (контексты `usePortal`/`useAuth` и `CrmSidebar` живут там):
  `shared/api/api.ts:3`, `shared/lib/use-localized-link.ts:7`, `portal-info.hook.ts:3`,
  `member-create.hook.ts:5`, `member-status-items.hook.ts:8`, `command-palette.tsx:20`,
  `billing/use-billing.ts:9`, `register-employee-form.tsx:12`, `login-form.tsx:10`,
  `portal-switcher.tsx:22`, `header-quick-actions.tsx:13`, `account-menu.tsx:25`, `crm-shell.tsx:6`.
  Перенести контексты портала и auth в `shared/lib`, сайдбар и бренд — в `widgets/crm-shell`.
- features→features: `billing/use-billing.ts:12` (`../auth/lib/credentials`) — вынести в shared.
- Толстые route-страницы: `app/[locale]/[portal]/crm/employees/page.tsx` (273 строки: таблица,
  мутации, пагинация, `confirm()`, русские строки) → `pages/employees` + виджет на `EntityList`;
  `attendance/page.tsx`, `scan/page.tsx`, `order|product/details/[id]` (`params.id as string`).
- Копии: `auth/login/page.tsx` == `[portal]/auth/login/page.tsx`; три одинаковых auth-layout;
  6 auth-страниц с одной и той же `Card`; пути строками вместо `ROUTES` в 3 страницах.
- Глубокие импорты мимо `index.ts` слайса (5 мест); `shared/ui/NavButtons` — не shared.
- После переноса — `eslint-plugin-boundaries` с правилами слоёв в `apps/crm/eslint.config`.

### R12. Переводы `[ ]` P1 · M

185 строк русского текста в 22 файлах вне i18n: `entity-settings/stages-tab` 28, `statuses-tab` 23,
`employees/page` 18, `forms-tab` 16, `fields-tab` 14, `invitations-settings` 13,
`entity-records-page` 12, `entities-settings` 11, `create-field-modal` 11, `invite-accept` 7,
`entity-settings-page` 6, `records-table` 5, `EntityCard` 4, `QrCameraScanner*` 4+4 и ещё 7 файлов
по 1–2; английские — `register-employee-form` (~14), `member-page.tsx:30-48`, `LoadingScreen`,
«Loading...» ×7 в превью документов. Роли показываются сырыми ключами, хотя
`crm.shell.account.roles.*` есть. Нет неймспейсов для employees, invitations, entities, records.
Наборы ключей ru/en/es совпадают (crm 668, auth 122, common 12, navigation 11, profile 13);
`profile.json` не подключён (`i18n.ts:39-44`); ~37 ключей не используются
(`auth.register.status.*`, `crm.members.editor.filesTitle/uploadFiles`, `crm.members.viewMode*`).

### R13. Общие компоненты вместо копий `[ ]` P1 · M

- В `packages/ui` нет Sheet, Badge, ConfirmDialog, Spinner, Pagination, Tabs, PageHeader — CRM
  собирает их на месте: `SHEET_CLASS` дважды (`skin-picker-dialog.tsx:20`, `EntityFilter.tsx:43`);
  7 карт цветов статусов (`OrdersTable:38,47`, `invitations-settings-page:24`, `employees/page:26`,
  `links-list:33`, `billing-panel:20`, `settings-hub/panels:230`) и 33 сырых `bg-*-500/10
text-*-700` без тёмного варианта (не на токенах `--success`/`--warning`); 13 рукописных
  `data-slot="badge"`; 27 копий спиннера `Loader2`; `confirm()` ×7; 4 самодельных модалки без
  Escape и focus trap (`member-profile-edit-modal:113`, `member-document-edit-modal:141`,
  `entity-records-page:92`, `create-field-modal:76`).
- Хелперы: `formatMemberName` (×12 конкатенаций `${name} ${surname ?? ""}`), `getFieldValue`
  (`field.value as unknown` ×6), форматирование дат по локали (~15 `toLocale*String()` без локали),
  `useCopyToClipboard` (×3), один `getApiErrorMessage` (`shared/lib/api-error.ts:30` проверяет
  axios-форму и не ловит `ApiClientError`), сборка URL ссылок в одном месте (`join-url.ts` и
  `invitations-settings-page.tsx:41`).
- В `packages/ui`: два `Field` (shadcn-примитивы и `shared/field`), `table` не экспортируется из
  индекса, `Iridescence` — default export, `index.ts` и `shared/index.ts` дублируют экспорт.

### R14. Все списки на `EntityList` + `EntityFilter` `[ ]` P1 · M

Сейчас три стиля: URL-состояние (участники, заказы), локальный `useState` страницы
(`ProductsTable.tsx:22`), ручные таблицы с prev/next (`TransactionsTable:53`, `SessionsTable:61`,
`links-list:160`, `employees/page:160`); 7 сырых `<table>` при наличии `UI/components/table.tsx`.
Перевести товары, транзакции, сессии, ссылки регистрации, сотрудников, приглашения и записи
смарт-процессов; фильтр — из [crm-polish](crm-polish.md) TASK-601 (пресеты — туда же).

### R15. Мёртвый код и зависимости CRM `[ ]` P2 · S

Полностью закомментированные файлы: `features/auth/register/hooks/submit-register.hook.ts`,
`widgets/member/documents/components/MemberSignatureEditCard.tsx` (ещё реэкспортируется),
`shared/lib/auth.ts`. Неиспользуемые: `shared/ui/EntityCard/*` (494 строки), `LangSwitcher`,
`SkinPickerDialog`, `QrCameraScanner` (второй сканер; живой — `QrCameraScannerYudiel`),
`ProductFormDialog`, компоненты `NavButtons` (нужен только `useCrmLogout`), `shared/lib/routes.ts`,
`getApiErrorStatus`, `shared/config/i18n/types.ts`, `ROUTES.HOME/PROFILE/PROFILE_SETTINGS`,
~12 хуков сущностей. Зависимости: `axios`, `clsx`, `tailwind-merge` не используются,
`html5-qrcode` — только мёртвым сканером. Остатки: закомментированный код в
`member/details/[id]/page.tsx:1,11-22` и `member-page.tsx:20-22` (там же блоки info/QR/documents
смонтированы дважды, L82-103), `console.info` в `QrScannerDialog.tsx:124,132`, заглушки `title` в
`processes/navigation/crm/data.tsx`.

### R16. CSS по приложениям `[ ]` P2 · S

`globals.css` тянет `skins.css` (1369 строк), `burger.css` и `shell.css`, и их получают также
`apps/admin` и `apps/web`; `@source "../../../apps/**"` сканирует все приложения, строка 3
указывает на несуществующую папку, `@import` на L83-85 стоят после правил. Разнести: токены —
общие, скины и shell — только в CRM, `@source` по приложению. 10 `!important` оправданы
(eco-режим и reduced-motion).

---

## По модулям API

| Модуль                                    | Что болит                                                                                                              | Что делать                           | Оценка | Приоритет |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------ | --------- |
| portal/public, portals                    | Prisma и логика в 6 контроллерах, `platform-portals` без DTO и 404, два неиспользуемых маршрута                        | R1.1, R7                             | M      | P1        |
| portal/auth, employees/auth, members/auth | близнецы, 3 копии JwtModule, 4 копии verify/reset, `@Req()` для cookie, два пути создания сотрудника                   | R2, R4                               | L      | P1        |
| entity-fields                             | 10 сервисов на Prisma без репозиториев, ~18 поисков definition, magic-строки, нет тестов                               | R1.2, R8                             | L      | P1        |
| records                                   | Prisma-типы в сервисе, `limit/skip`, копия default stage                                                               | R1.2, R5                             | M      | P1        |
| members                                   | `members.service`/`join-portal` на Prisma, запись без транзакции (B10), display-name ×7, form-schema handler ×3        | R3, R4, B10                          | M      | P1        |
| registration-links, invitations           | lifecycle токен-ссылок написан дважды, Prisma-типы, invitations без тестов                                             | R1.5 (shared token-link service), R8 | M      | P1        |
| catalog, orders, finance                  | `sortBy` → 500 (B3), LIKE без экранирования (B6), `Prisma.Decimal` в сервисах, русские ошибки, `throw new Error` → 500 | B3, B6, R1.3, R6                     | M      | P1        |
| presence, qr-codes                        | `entityRecordIdForMember` без портала (B4), HTTP-исключения в репозиториях, QR 200 `{valid:false}`, cron-лог           | B4, R3, R6                           | S      | P0/P2     |
| billing, cron                             | `payments.service`/`billing-cron` — репозитории под видом сервисов, сырой SQL в application                            | R1.4                                 | M      | P2        |
| storage, s3, mail                         | проглоченные ошибки, `console.*`, `any`                                                                                | B7, R6                               | S      | P1        |
| platform                                  | `platform-auth.service` и контроллеры на Prisma, нет тестов                                                            | R1.1, R8                             | S      | P2        |
| users                                     | мёртвый `UsersService` + DTO + спека                                                                                   | R7                                   | S      | P2        |
| common                                    | `PaginationDto.sortBy` без белого списка, 14 алиасов, `src/generated`, `prisma:push`                                   | R4, R5, R7                           | S      | P1        |

## По слоям CRM

| Слой                | Что болит                                                                                                                        | Что делать    | Оценка | Приоритет |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------ | --------- |
| app/ (route pages)  | employees — 273 строки логики, сырой fetch в `[portal]/layout`, копии auth-страниц и layout-ов                                   | R11, B8       | M      | P1        |
| entities/           | ответы без проверки (B1), `as never` в employee API, ключи запросов вразнобой, кеш не по клубу (B2), ~12 мёртвых хуков           | R9, R10, R15  | M      | P0/P1     |
| features/           | `billing → auth` напрямую, формы без i18n (employees), `confirm()`                                                               | R11, R12, R13 | M      | P1        |
| widgets/            | свои таблицы и пагинации, карты статусов, имя участника ×12                                                                      | R13, R14      | M      | P1        |
| pages/              | entity-settings/records/invitations/invite-accept без i18n (~150 строк), самодельные модалки, `member-page` дублирует EntityCard | R12, R13      | M      | P1        |
| processes/          | держат контексты, на которые смотрят все слои                                                                                    | R11           | S      | P1        |
| shared/             | `NavButtons`, `EntityCard`, `routes.ts`, второй `getApiErrorMessage`, `SHEET_CLASS`                                              | R13, R15      | S      | P2        |
| packages/ui         | нет Sheet/Badge/ConfirmDialog/Spinner/Pagination, два `Field`, `table` не экспортирован                                          | R13           | M      | P1        |
| packages/api-client | всё в порядке; после R5 — регенерация                                                                                            | —             | S      | —         |

---

## Порядок веток

1. `fix/audit-bugs` — B1…B10 (каждый фикс с тестом там, где он возможен: B3, B4, B5, B6 — e2e).
2. `refactor/crm-api-responses` — R9 + R10 (с `queryClient.clear()` при смене клуба).
3. `refactor/api-validation` — R4 + R5 (пагинация, `textSearch`, `sortBy`), регенерация api-client.
4. `chore/dead-code` — R7 + R15 + R16.
5. `refactor/crm-i18n` — R12.
6. `refactor/ui-kit` — R13 (Sheet, Badge, ConfirmDialog, Spinner) → затем R14 список за списком.
7. `refactor/crm-fsd` — R11 + eslint-boundaries.
8. `test/api-coverage` — R8 (invitations, entity-fields, processors) → `refactor/entity-fields-repos` — R1.2.
9. `refactor/auth-unify` — R2.
10. `refactor/api-layers` — остаток R1, затем strict-флаги.

Безопасность (TASK-661) — отдельно: [security-audit](security-audit.md), раздел TASK-66x.
