# Multitenant + Auth Playbook (Next.js + current project)

## Зачем Next.js вообще выделяет тему multi-tenant

Next.js App Router часто используют как "один деплой -> много клиентов (tenants)".  
Отсюда и отдельный гайд: как правильно резолвить tenant, маршрутизировать, кешировать и не допускать data leakage между клиентами.

Практически это нужно, когда:

- один код обслуживает много клубов;
- у каждого клуба свои данные/настройки/домен;
- но инфраструктура и релизы общие.

Официальный гайд нужен как архитектурный baseline, чтобы не изобретать опасные паттерны руками: [How to build multi-tenant apps in Next.js](https://nextjs.org/docs/app/guides/multi-tenant).  
И там же Next.js ссылается на production-ориентированный starter: [Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit).

---

## Что такое tenant в вашем контексте

В вашем проекте tenant = **portal/club**.

Каждый запрос должен однозначно отвечать на вопрос:

1. какой `portalId` сейчас активен;
2. имеет ли текущий пользователь доступ именно к этому `portalId`.

Если это не решено жестко, multitenant считается небезопасным.

---

## Как организовать multitenant, чтобы auth продолжала работать

## 1) Tenant resolution (обязательно)

На входе запроса определяем tenant:

- по домену (`club-a.app.com`, `club-b.app.com`) **или**
- по slug в URL (`/p/club-a/...`).

Результат: `tenantContext = { portalId, portalSlug, planStatus, features }`.

## 2) Tenant-aware auth

В сессии/токене должны быть минимум:

- `userId`
- `portalId`
- `role`
- `sessionId`

И на сервере проверка:

- `token.portalId === tenantContext.portalId`
- роль имеет доступ к endpoint

Если нет -> 403 без компромиссов.

## 3) Data isolation в БД

У всех бизнес-сущностей:

- явный `portalId` (или строгая цепочка до него).

Каждый repository/query:

- всегда фильтрует по `portalId`.

Нельзя полагаться только на frontend routes.

## 4) Session strategy (лучше для web)

Для CRM/Web лучше:

- HttpOnly Secure cookies (refresh/session),
- короткий access token или server session,
- rotation + revoke.

Это обычно безопаснее, чем хранить long-lived токены в localStorage (меньше риск XSS-утечки).

## 5) Middleware/edge guards

На уровне middleware:

- tenant resolve,
- базовые redirect rules,
- deny unknown domain/slug.

На уровне backend guards:

- auth + role + portal match.

---

## Почему это критично в Next.js App Router

В App Router есть server components, caching, route handlers, revalidation.  
Если tenant-контекст не прошит в ключи кеша и в data-fetching, можно случайно отдать данные другого портала.

Поэтому multi-tenant гайд Next.js важен не "для красоты", а чтобы избежать ошибок в рендере/кеше/роутинге.

Источник: [Next.js multi-tenant guide](https://nextjs.org/docs/app/guides/multi-tenant).

---

## Лучший вариант для быстрого и надежного старта в текущем проекте

Ниже pragmatic path без "большого взрыва".

## Stage A (самый быстрый безопасный baseline)

1. Ввести таблицу `portals`.
2. Добавить `portalId` в ключевые сущности (`employees`, `members`, `orders`, `products`, `presence`).
3. Сделать slug-based routing сначала (`/{portal}/{locale}/...`), без custom domains.
4. В auth-контекст добавить `portalId`.
5. Во всех backend запросах добавить mandatory `portalId` фильтр.
6. Добавить интеграционные тесты на cross-portal isolation.

Почему это лучший старт:

- быстро внедряется;
- не требует сразу DNS/SSL automation;
- закрывает главный риск утечки данных.

## Stage B (стабилизация auth)

1. Перевести browser auth на cookie-based session/refresh.
2. Сделать session revocation/logout-all.
3. Добавить tenant-aware middleware в CRM и web.

## Stage C (масштабирование SaaS)

1. Billing/subscription status gates.
2. Platform admin.
3. Custom domains.
4. Dynamic fields/entities.

---

## Что выбрать прямо сейчас: domain vs slug

Для старта:

- **Slug mode first** (`/{portal}/...`) -> проще, быстрее, дешевле, надежнее запуск.

Потом:

- domain mapping как апгрейд.

Так делают многие SaaS: сначала tenancy-ядро, потом домены.

---

## Минимальный технический контракт (рекомендация)

Каждый request context (api/crm/web) должен содержать:

- `portalId`
- `userId | null`
- `role | null`
- `locale`
- `planStatus`
- `featureFlags`

Все use-cases принимают этот context явно, а не достают tenant "магией" из глобалов.

---

## Антипаттерны (не делать)

- tenant только в frontend URL, без backend проверки;
- "иногда фильтруем по portalId, иногда нет";
- один shared cache key на разные порталы;
- авторизация без проверки `portalId` в токене/сессии;
- localStorage-only long-term auth для критичного CRM.

---

## Быстрый execution plan для текущего репо

1. ADR: tenancy + auth model (1-2 дня).
2. Schema migration с `portalId` + backfill (2-4 дня).
3. API guards/repositories tenant-enforced (3-6 дней).
4. CRM/web routes с portal slug (2-4 дня).
5. Auth claims + middleware (2-4 дня).
6. Isolation test suite (2-3 дня).

Итого: рабочий baseline можно собрать примерно за 2-4 недели при сфокусированной работе.

---

## Детализированный пошаговый план (инструкция)

Ниже именно "что и в каком порядке делать" для текущего монорепо.

## Шаг 0. Принять канонический URL и нейминг портала

Решение:

- primary идентификатор в системе: `portalId` (UUID, внутренний);
- публичный идентификатор в URL: `clubName` (slug, уникальный);
- основной формат URL: `https://bro.com/{clubName}/{locale}/...`.

Правила для `clubName`:

- уникальный индекс в БД;
- только `[a-z0-9-]`, длина 3..40;
- immutable после активации (или через отдельный controlled flow с redirect-map).

## Шаг 1. Модели БД для порталов и платформы

Добавить сущности:

- `Portal`
  - `id`
  - `clubName` (unique)
  - `displayName`
  - `status` (`active`, `suspended`, `archived`)
  - `createdAt`, `updatedAt`

- `PortalDomain` (на будущее под custom domains)
  - `id`, `portalId`
  - `domain`
  - `isPrimary`
  - `verificationStatus`

- `PortalSubscription`
  - `id`, `portalId`
  - `planCode`
  - `status` (`trialing`, `active`, `past_due`, `suspended`, `canceled`)
  - `currentPeriodStart`, `currentPeriodEnd`

- `PlatformAdmin`
  - `id`, `email`, `passwordHash`, `isActive`

Во все CRM бизнес-модели добавить `portalId`:

- `Employee`, `Member`, `Order`, `Product`, `PresenceSession`, `QrCode`, и т.д.

Проверки:

- уникальности сделать в паре с `portalId` там, где это логично;
- добавить индексы `(portalId, <часто фильтруемое поле>)`.

## Шаг 2. Регистрация нового портала (club onboarding)

Новый endpoint: `POST /platform/portals/register`

При регистрации:

1. Валидируем уникальность `clubName`.
2. Создаем `Portal`.
3. Создаем `portal_owner` сотрудника для CRM.
4. Создаем trial/active subscription (в зависимости от бизнес-правил).
5. Создаем default настройки CRM (модули/fields/forms).
6. Возвращаем login/session для owner.

Важно: `portal_owner` нельзя удалить из CRM (можно только transfer ownership).

## Шаг 3. Tenant resolution на backend и frontend

## Backend

- middleware извлекает `clubName` из URL (или host позже);
- резолвит `Portal` и пишет в request context:
  - `portalId`, `clubName`, `planStatus`, `features`.

## Frontend (CRM + Web/LK)

- все роуты приводим к `/{clubName}/{locale}/...`;
- Next middleware проверяет `clubName`, invalid -> 404/landing;
- helper для локализованных ссылок принимает `clubName`.

## Шаг 4. Апгрейд auth: localStorage -> cookie session

Это ваш ключевой рефакторинг.

## 4.1 Что добавляем

- `CookieService` в backend:
  - set access cookie (short-lived)
  - set refresh cookie (long-lived, rotation)
  - clear auth cookies

- `Session`/`RefreshToken` хранилище:
  - `sessionId`
  - `userId`
  - `portalId`
  - `deviceInfo`, `ip`, `expiresAt`, `revokedAt`.

## 4.2 Что убираем

- хранение access/refresh в `localStorage` в CRM/Web;
- прямой доступ frontend к токенам.

## 4.3 Новый flow

1. Login -> backend ставит HttpOnly cookies.
2. Frontend делает запросы с `credentials: include`.
3. При истечении access backend/refresh endpoint делает rotation.
4. Logout -> revoke session + clear cookies.
5. Logout-all -> revoke все сессии пользователя/портала.

Cookie policy:

- `HttpOnly: true`
- `Secure: true` (prod)
- `SameSite: Lax` (или `Strict`, если нет cross-site сценариев)
- разные cookie names для env/namespace.

## 4.4 Tenant checks в auth

В session/token claims:

- `portalId` обязателен.

На каждом protected endpoint:

- сверяем `session.portalId` и `request.portalId`;
- mismatch = `403` + security log.

## Шаг 5. Рефакторинг API слоя под tenant-enforced доступ

Для каждого repository/service:

- убрать методы без tenant фильтра;
- сигнатуры use-case: `(ctx, input)`, где `ctx.portalId` обязателен;
- запросы всегда включают `where: { portalId: ctx.portalId, ... }`.

Добавить тесты:

- пользователь portal A не может прочитать/изменить данные portal B;
- brute test на list/detail/update/delete endpoints.

## Шаг 6. Fields как отдельная подсистема (schema-driven)

Нужные модели:

- `EntityDefinition` (member/product/order/custom)
- `FieldDefinition`
  - `portalId`
  - `entityCode`
  - `fieldKey`
  - `labelI18n` (json)
  - `type` (`string`, `number`, `select`, `signature`, `email`, `phone`, ...)
  - `required`
  - `isSystem`
  - `isPublic`
  - `isMultiple`
  - `validationRules` (json)
  - `sortOrder`
  - `isVisibleInCabinet`

- `FieldOption` (для select/multiselect)
- `EntityRecord` (или существующие таблицы)
- `FieldValue`
  - `portalId`
  - `entityCode`
  - `entityRecordId`
  - `fieldKey`
  - value (typed columns или JSONB + type tag)

System vs user fields:

- `isSystem = true` нельзя удалить, можно скрыть/ограниченно редактировать;
- `isSystem = false` можно архивировать/редактировать в рамках правил.

## Шаг 7. Получение, хранение и фильтрация по fields

## Хранение

MVP-подход:

- `FieldValue.valueJson` + обязательная валидация типа;
- индексы для часто используемых фильтров (GIN/BTREE по extracted полям).

Более строгий подход (позже):

- typed storage по типам (`valueString`, `valueNumber`, `valueDate`, ...).

## Фильтрация

API формат фильтров:

- `filters[fieldKey][operator]=value`
- операторы: `eq`, `neq`, `contains`, `in`, `gt`, `lt`, `between`.

Backend:

- сначала валидирует, что `fieldKey` существует для `portalId + entity`;
- проверяет тип и оператор;
- строит безопасный query builder.

## Шаг 8. Апгрейд регистрации member через fields

Новый flow:

1. Frontend запрашивает public schema:
   - `GET /public/{clubName}/{locale}/member-registration-schema`.
2. Рендерит форму динамически по `FieldDefinition`.
3. Валидирует на клиенте по этой же схеме.
4. Отправляет `payload` как `Record<string, unknown>`.
5. Backend валидирует снова по portal-specific schema.
6. Создает member + field values.

Плюс:

- в CRM настройках можно включать/выключать поля для внешней регистрации (`isPublic`);
- там же задавать порядок, required, label на языках.

## Шаг 9. CRM настройки -> что видно в личном кабинете

Добавить настройки отображения:

- `cabinetVisibility` per field (`hidden`, `readonly`, `editable`);
- section-level toggles (profile/orders/presence);
- module toggles (например, attendance on/off).

Frontend LK (`apps/web`) читает эту конфигурацию и строит интерфейс динамически.

## Шаг 10. Генерация ссылки и embed формы регистрации

В CRM settings:

- кнопка "Скопировать ссылку регистрации":
  - `https://bro.com/{clubName}/{locale}/register`.

- кнопка "Встроить на сайт":
  - выдать embed snippet:
    - iframe URL вида `https://bro.com/{clubName}/{locale}/embed/register`
    - или JS widget script.

Для embed:

- CORS policy;
- rate limit;
- anti-bot (captcha/honeypot);
- optional signed config token.

## Шаг 11. Отдельные задачи по приложениям

## Backend (`apps/api`)

- [ ] `Portal`, `PortalSubscription`, `PortalDomain` модели и миграции
- [ ] `portalId` в бизнес-таблицах
- [ ] portal resolver middleware
- [ ] cookie auth services + session store + refresh rotation
- [ ] revoke/logout-all
- [ ] tenant guards + audit logs
- [ ] fields schema engine + values API
- [ ] public registration schema endpoint
- [ ] registration submit endpoint (dynamic payload)

## CRM frontend (`apps/crm`)

- [ ] route refactor: `/{clubName}/{locale}/crm/...`
- [ ] tenant-aware link builders
- [ ] убрать localStorage token flows
- [ ] auth via cookies (`credentials: include`)
- [ ] settings UI: fields/modules/cabinet visibility
- [ ] onboarding flow для owner и portal setup
- [ ] registration link + embed generation UI

## Web/LK frontend (`apps/web`)

- [ ] route refactor: `/{clubName}/{locale}/...`
- [ ] dynamic member registration form renderer
- [ ] dynamic profile/cabinet sections by CRM config
- [ ] auth update на cookie sessions
- [ ] fallback handling для отключенных модулей

## Шаг 12. Definition of Done для миграции с localStorage

Считаем задачу завершенной только когда:

- в `apps/crm` и `apps/web` нет чтения auth токенов из `localStorage`;
- login/logout работают через HttpOnly cookies;
- refresh flow проходит без участия JS в хранении токена;
- есть e2e тесты:
  - login
  - token refresh
  - logout
  - logout-all
  - portal mismatch -> 403.

---

## Переезд на Entity Fields (подробно)

Ниже детальный план миграции с фиксированных DTO на schema-driven `entity-fields`.

## Цель

Сделать так, чтобы:

- у каждого портала были свои поля сущностей;
- при создании портала появлялся "базовый набор полей" по умолчанию;
- системные поля нельзя было сломать;
- frontend формы строились из схемы;
- backend валидировал payload строго по схеме портала;
- фильтрация и поиск работали по этим полям.

## 1) Концепт: шаблон + инстанс

Разделяем два уровня:

1. **Platform templates** (глобальные дефолты, immutable источник).
2. **Portal field configs** (копия шаблона в портал, редактируемая по правилам).

Это решает проблему onboarding:

- при регистрации нового portal не нужно руками собирать поля;
- сразу создается рабочая CRM + рабочая форма регистрации member.

## 2) Рекомендуемые модели (минимум)

- `FieldTemplate`
  - `id`
  - `entityCode` (`member`, `product`, `order`, ...)
  - `fieldKey`
  - `type`
  - `defaultLabelI18n`
  - `defaultValidation`
  - `defaultIsRequired`
  - `defaultIsPublic`
  - `defaultIsVisibleInCabinet`
  - `isSystem`
  - `isDeletable` (обычно `false` для system)

- `PortalField`
  - `id`, `portalId`
  - `entityCode`, `fieldKey`
  - `type`
  - `labelI18n`
  - `required`
  - `isPublic`
  - `isVisibleInCabinet`
  - `isSystem`
  - `isArchived`
  - `validationRules`
  - `sortOrder`

- `PortalFieldOption` (для select/multiselect)
- `EntityRecord` + `FieldValue` (или hybrid storage)

## 3) Что создается по умолчанию при установке CRM

Когда создается `Portal`, запускается `PortalBootstrapService`:

1. Копирует `FieldTemplate` -> `PortalField`.
2. Инициализирует default порядок полей по сущностям.
3. Создает default формы:
   - member registration (public)
   - member profile (cabinet)
   - product create/edit (crm)
   - order create/edit (crm)
4. Проставляет default visibility:
   - что видно в CRM,
   - что видно в LK,
   - что доступно во внешней регистрации.

## 4) System fields vs user fields (жесткие правила)

System field:

- нельзя удалить;
- нельзя менять `type`;
- можно менять label, required (если это безопасно), порядок, видимость (в пределах правил).

User field:

- можно создавать/редактировать/архивировать;
- можно скрывать из UI;
- удаление физически лучше не делать: `isArchived=true`, чтобы не потерять историю.

## 5) Пошаговый migration plan (без big-bang)

## Phase 1 - Read model рядом с текущими DTO

1. Ввести `FieldTemplate`/`PortalField` таблицы.
2. Наполнить шаблоны текущими "зашитыми" полями `member/product/order`.
3. Для существующих порталов сгенерировать `PortalField` через backfill.
4. Оставить старые DTO рабочими (dual-mode).

## Phase 2 - Dynamic schema API

Добавить endpoints:

- `GET /crm/settings/entities/{entityCode}/fields`
- `POST /crm/settings/entities/{entityCode}/fields`
- `PATCH /crm/settings/entities/{entityCode}/fields/{fieldId}`
- `POST /crm/settings/entities/{entityCode}/fields/reorder`
- `POST /crm/settings/entities/{entityCode}/fields/{fieldId}/archive`

Public schema:

- `GET /public/{clubName}/{locale}/schemas/member-registration`

Cabinet schema:

- `GET /cabinet/schemas/member-profile`

## Phase 3 - Frontend renderer

Создать в `@workspace/ui` универсальный renderer:

- получает schema;
- рендерит компоненты по `type`;
- отдает normalized payload.

Поддержать типы v1:

- `string`, `text`, `number`, `email`, `phone`, `date`, `select`, `multiselect`, `boolean`, `signature`, `file`.

## Phase 4 - Backend validation engine

Сервис `FieldValidationService`:

1. Берет `PortalField` для `portalId + entityCode`.
2. Строит runtime schema (zod/class-validator adapter).
3. Валидирует payload.
4. Возвращает normalized value map.

После этого use-case пишет данные в `FieldValue`.

## Phase 5 - Переключение регистрации member

1. `apps/web` получает registration schema.
2. Форма рисуется renderer-ом.
3. Submit отправляет dynamic payload.
4. Backend принимает только schema-driven payload.
5. Старый DTO endpoint помечается deprecated и удаляется позже.

## 6) Как апгрейдить текущую регистрацию пользователя

Текущий state:

- поля member в коде статичны;
- DTO и валидация жестко зашиты.

Целевой state:

- форма строится по `PortalField` (`isPublic = true`);
- required/type/labels/validation приходят с backend;
- backend валидирует по той же схеме и создает member.

Пошагово:

1. Синхронизировать текущие фиксированные поля в templates.
2. Сделать API `member-registration-schema`.
3. Реализовать `DynamicRegistrationForm` (рядом со старой формой).
4. Переключить route флагом (`FEATURE_DYNAMIC_MEMBER_FORM`).
5. После стабилизации удалить старый static form path.

## 7) Как этим управлять в CRM (Settings -> Entity Fields)

Нужен раздел:

- `CRM > Settings > Entities > {Entity} > Fields`

Функции:

- список полей (system/user);
- создание custom field;
- редактирование label/required/rules/visibility;
- drag-and-drop sort;
- archive/unarchive;
- preview формы (CRM/LK/Public registration).

Ограничения UI:

- для system поля блокируем dangerous-изменения (`type`, `fieldKey`);
- показываем impact warning: "изменение required сломает submit старых форм".

## 8) Хранение данных fields

MVP:

- `FieldValue(valueJson)` + строгая runtime validation + нормализация.

Для производительности:

- materialized projections для фильтров/сортировок;
- индексы по частым ключам;
- migration на typed columns для hot fields при необходимости.

## 9) Фильтрация по fields (CRM list pages)

API поддержка:

- фильтры по `fieldKey` и operator (`eq`, `contains`, `in`, `gt`, ...)
- сортировка по fieldKey (только разрешенные типы)

Backend pipeline:

1. validate filter keys against `PortalField`.
2. validate operator by field type.
3. apply query builder with `portalId` scope.

Нельзя:

- принимать raw SQL-like filter from frontend;
- фильтровать по архивным/неразрешенным полям без явной политики.

## 10) Как показывать поля в личном кабинете (LK)

В `PortalField` добавить отдельные флаги:

- `isVisibleInCabinet`
- `isEditableInCabinet`
- `cabinetSection` (`profile`, `documents`, `preferences`, ...)

LK (`apps/web`) запрашивает schema и строит UI динамически.

CRM owner/admin управляет этим в settings, без релиза кода.

## 11) Версионирование схемы (важно)

Ввести `schemaVersion` для каждой entity формы:

- при изменении полей увеличивать версию;
- payload сохранять с версией;
- это поможет разбирать исторические данные и откаты.

## 12) Безопасность и консистентность

- field-level permission checks;
- audit log на изменение схемы полей;
- soft delete only для user fields;
- миграционные jobs при смене типа (если разрешено политикой);
- anti-breaking checks перед публикацией схемы.

## 13) Definition of Done для entity-fields миграции

Считаем миграцию завершенной, когда:

- member registration полностью schema-driven;
- CRM settings позволяет управлять member/product/order fields;
- LK отображает поля по portal schema;
- backend не использует hardcoded DTO для этих форм;
- есть e2e:
  - создать поле в CRM,
  - поле появляется в registration/LK,
  - submit проходит с валидной валидацией,
  - фильтрация по новому полю работает.

---

## Итог

Для вашего проекта лучший старт:

- slug-based multitenant;
- tenant-aware auth (portalId в сессии/токене);
- жёсткая backend изоляция по portalId;
- cookie-based web auth;
- только потом billing/domains/dynamic entities.

Это дает максимально быстрый и надежный выход без риска "полусломанного multitenant".

---

## Ссылки

- Next.js guide: [How to build multi-tenant apps in Next.js](https://nextjs.org/docs/app/guides/multi-tenant)
- Example architecture: [Platforms Starter Kit](https://vercel.com/templates/next.js/platforms-starter-kit)
