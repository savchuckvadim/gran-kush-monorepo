# Multitenant: план задач

Дата анализа: 2026-05-19  
Ветка: `tenant-crm`  
Статус: ~65% готовности к production multitenant

---

## Легенда статусов

- `[ ]` — не начато
- `[~]` — в процессе / частично
- `[x]` — завершено

---

## Обзор состояния

### Что уже готово

- [x] Prisma schema: модель `Portal`, `portalId` во всех основных сущностях (`Member`, `Employee`, `Order`, `EntityRecord`, `FieldValue`, `PresenceSession`, `QrCode`, `Token`, `EmployeeToken`)
- [x] Auth employees: `POST /crm/auth/login`, `/refresh`, `/logout`, `GET /crm/auth/me` (HttpOnly cookies)
- [x] Auth employees mobile: `POST /crm/mobile/auth/*` (Bearer)
- [x] Auth members: `POST /lk/auth/login`, `/refresh`, `/logout`, `GET /lk/auth/me`
- [x] Auth members registration: `/lk/auth/member/register`, `/check`, `/confirm-email`, `/registration-schema`
- [x] Auth members password reset: `/lk/auth/password/reset`, `/reset/confirm`
- [x] `PortalContextMiddleware` — извлекает `X-Portal-Id` / `X-Portal-Slug` из headers
- [x] `PortalTenantMatchGuard` — сравнивает `user.portalId` с `req.portalContext.portalId`, 403 при несовпадении
- [x] `@PortalId()` декоратор — извлекает `portalId` из request context
- [x] CRM members: `GET/POST /crm/members`, `GET/PATCH /crm/members/:id`, files upload, dynamic fields
- [x] CRM presence: QR scan, manual check-in/out, stats, auto-close
- [x] CRM orders: полная state machine, inventory management
- [x] CRM finance: транзакции, reports
- [x] CRM catalog: products, categories, measurement units (но без portalId — см. P0)
- [x] Entity-fields система: `EntityDefinition`, `FieldDefinition`, `FormDefinition`, `FieldValue`, dynamic validation
- [x] Platform module: `POST /platform/portals/register`, PlatformAdmin auth
- [x] Frontend routing: `[locale]/[portal]/crm/*`
- [x] Frontend `AuthProvider`: cookie-based, no localStorage
- [x] Frontend `PortalProvider`: инжектирует `X-Portal-Slug` header во все API запросы
- [x] Основные CRM страницы: members list/detail, products, orders, attendance, finance

---

## P0 — Критично (data isolation + безопасность)

### TASK-001: Добавить `portalId` в `Product` и `ProductCategory`

**Проблема:** `Product` (schema:911) и `ProductCategory` (schema:889) не имеют `portalId`. Продукты видны всем порталам — прямой data leak.

**Backend: `apps/api/prisma/schema.prisma`**
- [ ] Добавить в `ProductCategory`: `portalId String @map("portal_id")` + relation to Portal + `@@index([portalId])`
- [ ] Добавить в `Product`: `portalId String @map("portal_id")` + relation to Portal + `@@index([portalId])`
- [ ] Изменить уникальность `Product.sku`: с `@unique` на `@@unique([portalId, sku])`
- [ ] Изменить уникальность `ProductCategory.code`: с `@unique` на `@@unique([portalId, code])`
- [ ] Создать и применить миграцию: `pnpm --filter api prisma:migrate`

**Backend: repository interfaces**
- [ ] `product-repository.interface.ts` — добавить `portalId: string` в параметры `findAll`, `findById`, `create`, `count`
- [ ] `product-category-repository.interface.ts` — аналогично

**Backend: Prisma repositories**
- [ ] `ProductPrismaRepository` — добавить `where: { portalId, ... }` во все `findAll`, `findById` (через join если не прямой portalId), `count`
- [ ] `ProductCategoryPrismaRepository` — аналогично

**Backend: services**
- [ ] `ProductsService.findAll(portalId, ...)` — обязательный первый аргумент `portalId`
- [ ] `ProductsService.findById(id, portalId)` — проверка принадлежности портала
- [ ] `ProductsService.create(dto, portalId, employeeId)` — сохранять `portalId`
- [ ] `ProductsService.update(id, dto, portalId, employeeId)` — scope guard
- [ ] `ProductsService.delete(id, portalId)` — scope guard
- [ ] `ProductCategoriesService` — аналогично по всем методам

**Backend: controllers**
- [ ] `CrmCatalogController` — добавить `@PortalId() portalId: string` во все методы, прокинуть в сервисы
- [ ] `LkCatalogController` — аналогично (если не сделано)

---

### TASK-002: Добавить `portalId` в `StorageFile`

**Проблема:** `StorageFile` (schema:812) скоупится только по `userId`. Файлы не изолированы между порталами.

**Backend: `apps/api/prisma/schema.prisma`**
- [ ] Добавить `portalId String? @map("portal_id")` в `StorageFile`
- [ ] Добавить relation: `portal Portal? @relation(fields: [portalId], references: [id], onDelete: SetNull)`
- [ ] Добавить `@@index([userId, portalId])`
- [ ] Миграция

**Backend: `StorageService`**
- [ ] `uploadFile(...)` — принимать и сохранять `portalId`
- [ ] Методы листинга файлов — добавить `portalId` фильтр
- [ ] Проверка доступа при `getFile(path)` — убедиться что файл принадлежит запрашивающему порталу

---

### TASK-003: Проверить enforcement `revoked` флага в JWT стратегиях

**Проблема:** Поля `revoked Boolean @default(false)` есть в `Token` и `EmployeeToken`, но если стратегии не проверяют этот флаг, logout не работает на уровне server-side revocation.

**Backend: `apps/api/src/modules/portal/auth/employees/infrastructure/strategies/`**
- [ ] `employee-jwt-cookie.strategy.ts` — убедиться что `validateJwtPayload` ищет токен с `revoked: false`
- [ ] `employee-jwt-bearer.strategy.ts` — аналогично
- [ ] `employee-local.strategy.ts` — убедиться что активные сессии без revoked токенов допускаются

**Backend: `apps/api/src/modules/portal/auth/members/infrastructure/strategies/`**
- [ ] `member-jwt-cookie.strategy.ts` — аналогично
- [ ] `member-jwt-bearer.strategy.ts` — аналогично

---

### TASK-004: Аудит и доработка `ProvisionPortalFromTemplatesService`

**Проблема:** При регистрации нового портала (`POST /platform/portals/register`) должен создаваться полный seed конфигурации. Без него каждый новый портал будет сломан: `MembersService:82` бросает исключение если не сконфигурирован `member_lifecycle` status set.

**Файл:** `apps/api/src/modules/portal/crm/entity-fields/application/services/provision-portal-from-templates.service.ts`

- [ ] Проверить что сервис вызывается из Platform portal registration flow
- [ ] Убедиться что создаётся `EntityDefinition` для `member` с кодом из `ENTITY_DEFINITION_CODES.MEMBER`
- [ ] Убедиться что создаётся `StatusSet` с кодом `member_lifecycle` и статусами: `inProgress`, `active`, `suspended`, `archived`
- [ ] Убедиться что создаются `FieldDefinition` по умолчанию (из `GlobalFieldTemplate`)
- [ ] Убедиться что создаются `FormDefinition` для всех `FormPurpose`: `public_registration`, `crm_create`, `crm_detail`, `member_cabinet`
- [ ] Убедиться что создаются `StageCategory` и `Stage` для orders
- [ ] Добавить транзакцию — весь provision в одном `prisma.$transaction`
- [ ] Написать интеграционный тест: создать портал → проверить что все структуры созданы

---

### TASK-005: Создать `middleware.ts` в CRM frontend

**Проблема:** `apps/crm/middleware.ts` **отсутствует**. Единственная защита — client-side `AuthProvider`. Это недостаточно: SSR страницы рендерятся без проверки auth, неизвестные portal slugs не блокируются.

**Файл:** `apps/crm/middleware.ts`

- [ ] Matcher: `['/((?!_next|favicon|api).*)']`
- [ ] Для routes `[locale]/[portal]/crm/*`:
  - Проверить наличие cookie `crm_access_token` (не декодировать, просто presence check)
  - Если нет — redirect на `/${locale}/${portal}/auth/login`
- [ ] Для routes `[locale]/[portal]/auth/*`:
  - Если cookie `crm_access_token` присутствует — redirect на `/${locale}/${portal}/crm`
- [ ] Для routes `[locale]/[portal]/*` (portal layout):
  - Опционально: HEAD-запрос к `${API_URL}/crm/portals/${portal}/exists` для валидации slug
  - Либо: обработать 404 от API на уровне Portal layout server component
- [ ] Для `[locale]/` без portal — redirect на landing или login с выбором портала

---

### TASK-006: Server-side валидация portal slug

**Проблема:** `apps/crm/app/[locale]/[portal]/layout.tsx:18` принимает любой portal slug и передаёт в `PortalProvider` без проверки существования портала.

**Файл:** `apps/crm/app/[locale]/[portal]/layout.tsx`

- [ ] В server component сделать fetch: `GET /crm/portals/${portal}` (или `/platform/portals/by-slug/${portal}`)
- [ ] Если 404 — `notFound()` из `next/navigation`
- [ ] Сохранить `portalId` и `displayName` в context для использования в CRM shell
- [ ] Убрать `console.log("portal", portal)` из layout (line 17)

**Backend (если endpoint не существует):**
- [ ] Создать `GET /crm/portals/resolve?slug=:slug` — public endpoint, возвращает `{ portalId, displayName, status }` или 404
- [ ] Добавить в `PortalContextModule`

---

## P1 — Высокий приоритет (функциональная полнота)

### TASK-007: CRM Employees контроллер

**Проблема:** В `apps/api/src/modules/portal/crm/employees/` нет HTTP контроллера. Нельзя управлять сотрудниками из CRM интерфейса.

**Backend: создать `CrmEmployeesController`**

Файл: `apps/api/src/modules/portal/crm/employees/api/controllers/crm-employees.controller.ts`

- [ ] `GET /crm/employees` — список сотрудников портала (фильтр по `portalId`)
  - Query params: `limit`, `skip`, `role`, `isActive`
  - Guard: `@RequireEmployeeJwt()` + `@Admin()`
- [ ] `GET /crm/employees/:id` — детали сотрудника
  - Guard: `@RequireEmployeeJwt()`
  - Scope check: employee.portalId === request.portalId
- [ ] `PATCH /crm/employees/:id` — обновление роли, position, department, isActive
  - Guard: `@RequireEmployeeJwt()` + `@Admin()`
  - Нельзя менять собственную роль portal_owner
  - Нельзя менять роль portal_owner другому
- [ ] `DELETE /crm/employees/:id` — деактивация (soft delete: `isActive = false`)
  - Guard: `@RequireEmployeeJwt()` + `@Admin()`
  - Нельзя деактивировать себя
  - Нельзя деактивировать portal_owner

**Backend: обновить `EmployeesService`**
- [ ] `findAll(portalId, filters)` — добавить `portalId` scope
- [ ] `findById(id, portalId)` — проверка принадлежности
- [ ] `updateEmployee(id, portalId, dto)` — с бизнес-правилами выше
- [ ] `deactivate(id, portalId)` — soft delete

**Backend: DTO**
- [ ] `UpdateEmployeeDto` — `role?`, `position?`, `department?`, `isActive?`
- [ ] `EmployeeListItemDto` — `id`, `name`, `surname`, `email`, `role`, `position`, `isActive`, `lastLoginAt`

**Backend: зарегистрировать в `EmployeesModule`**
- [ ] Добавить `CrmEmployeesController` в `controllers`

---

### TASK-008: Проверка portalId scope в Members, Orders, Presence

**Проблема:** `CrmMembersController.byId()` (line 122) не проверяет что `member.portalId === request.portalId`. Аналогично в orders и presence.

**Backend: `CrmMembersController`**
- [ ] `byId(@Param('id'), @PortalId() portalId)` — после `findById` проверить `member.portalId === portalId`, иначе 404
- [ ] `update(...)` — добавить `@PortalId()`, передать в сервис для scope check
- [ ] `updateFiles(...)` — аналогично

**Backend: `CrmOrdersController`** (если не сделано)
- [ ] `findById(id, portalId)` — scope check через `EntityRecord.portalId`
- [ ] `findAll(portalId, ...)` — обязательный portalId фильтр

**Backend: `CrmPresenceController`** (если не сделано)
- [ ] Все методы — scope check через `EntityRecord.portalId`

---

### TASK-009: CRM Employees страница во frontend

**Файл:** `apps/crm/app/[locale]/[portal]/crm/employees/page.tsx`

- [ ] Запрос `GET /crm/employees` через TanStack Query
- [ ] Таблица сотрудников: имя, email, роль, статус, lastLoginAt
- [ ] Кнопка пригласить/создать сотрудника (форма `POST /crm/auth/employee/register`)
- [ ] Inline изменение роли (Admin/Employee) для admin-пользователей
- [ ] Деактивация сотрудника с подтверждением
- [ ] Себя нельзя деактивировать — кнопка disabled

**Frontend: entities layer**
- [ ] `modules/entities/employee/api/employee.api.ts` — `getEmployees`, `updateEmployee`, `deactivateEmployee`
- [ ] `modules/entities/employee/hooks/employee.hook.ts` — `useEmployeesQuery`, `useUpdateEmployee`, `useDeactivateEmployee`

---

### TASK-010: Route helpers с portal slug

**Файл:** `apps/crm/modules/shared/lib/routes.ts`

- [ ] Создать `buildCrmRoute(locale: string, portal: string, path: string): string`
- [ ] Создать `buildAuthRoute(locale: string, portal: string, type: 'login' | 'register' | 'confirm-email'): string`
- [ ] Создать `useCrmNavigate()` hook — использует params из `useParams()` и возвращает `navigate(path)`
- [ ] Заменить все хардкоженные пути в компонентах на вызовы этих helpers

---

### TASK-011: Аудит `AuthProvider` и auth redirects

**Файл:** `apps/crm/modules/processes/auth/provider/AuthProvider.tsx`

- [ ] Убедиться что при 401 redirect идёт на `/${locale}/${portal}/auth/login` (с portal slug из URL)
- [ ] Убедиться что при 403 (portal mismatch) redirect идёт на login или forbidden page
- [ ] `isProtected` route check — убедиться что список protected routes актуален
- [ ] Loading state — убедиться что не фликает (SSR + hydration)
- [ ] Добавить `portalId` из `currentUser.portalId` в AuthContext для использования в компонентах

---

### TASK-012: Унификация auth routes в CRM

**Проблема:** Существуют `[locale]/auth/login` и `[locale]/[portal]/auth/login`. Дублирование непонятно.

- [ ] Определить назначение `[locale]/auth/*`:
  - Вариант A: это onboarding страница для создания нового портала (нет portal slug ещё)
  - Вариант B: это redirect страница → спрашивает portal slug → редиректит на `[portal]/auth/login`
- [ ] Реализовать выбранный вариант
- [ ] Убрать дублирование логики между двумя login страницами

---

## P2 — Средний приоритет (настройки и управление)

### TASK-013: Backend settings endpoints для Entity Fields

По playbook шаг 7. Нужно для CRM Settings UI.

**Файл:** создать `apps/api/src/modules/portal/crm/entity-fields/api/controllers/crm-entity-fields.controller.ts`

- [ ] `GET /crm/settings/entities/:entityCode/fields` — список field definitions для портала
  - Response: `id`, `fieldKey`, `type`, `label`, `isSystem`, `isRequired`, `sortOrder`, `isVisible`, `options[]`
  - Guard: `@RequireEmployeeJwt()` + `@Admin()`
- [ ] `POST /crm/settings/entities/:entityCode/fields` — создать custom field
  - Body: `fieldKey`, `type`, `label`, `isRequired`, `validationJson`, `sortOrder`
  - Нельзя создать field с `fieldKey` совпадающим с system field
- [ ] `PATCH /crm/settings/entities/:entityCode/fields/:fieldId` — обновить label, required, sortOrder, visibility
  - Для system fields — нельзя менять `type` и `fieldKey`
- [ ] `POST /crm/settings/entities/:entityCode/fields/reorder` — обновить `sortOrder` массовым update
  - Body: `[{ id, sortOrder }]`
- [ ] `POST /crm/settings/entities/:entityCode/fields/:fieldId/archive` — архивировать (soft delete)
  - Нельзя архивировать system fields

**Backend: `PortalEntityMetadataService`**
- [ ] Расширить сервис методами выше или создать отдельный `EntityFieldsAdminService`

---

### TASK-014: CRM Settings страница — Entity Fields

**Файл:** `apps/crm/app/[locale]/[portal]/crm/settings/page.tsx`

- [ ] Табы: Members Fields / Products Fields / Orders Fields
- [ ] Список полей: drag-and-drop sort (react-beautiful-dnd или @dnd-kit/core)
- [ ] Индикатор системных полей (нельзя удалить/архивировать)
- [ ] Inline редактирование label
- [ ] Чекбокс required / visible in LK / visible in registration
- [ ] Кнопка добавить custom field: диалог с выбором типа
- [ ] Кнопка архивировать (только user fields)
- [ ] Toast уведомления при успехе/ошибке (Sonner)

---

### TASK-015: Portal info в CRM Shell

**Проблема:** CRM shell показывает что-то в header, но не ясно что именно из portal данных подтягивается.

**Backend:**
- [ ] `GET /crm/portal/info` — возвращает `{ portalId, name, displayName, type, status, subscription { status, planName } }`
- [ ] Guard: `@RequireEmployeeJwt()`

**Frontend:**
- [ ] `modules/entities/portal/api/portal.api.ts` — `getPortalInfo()`
- [ ] `modules/processes/portal/` — расширить `PortalProvider` данными портала (displayName, type, planStatus)
- [ ] CRM Shell header — отображать `displayName` портала
- [ ] Если subscription `past_due` или `canceled` — banner с предупреждением

---

### TASK-016: Member status update из CRM

**Проблема:** Смена статуса мембера сейчас бандлована в общий `PATCH /crm/members/:id`. Нужен отдельный endpoint для явного управления.

**Backend:**
- [ ] `GET /crm/members/statuses` — список доступных статусов для портала (из `StatusSet` + `StatusItem`)
- [ ] `PATCH /crm/members/:id/status` — тело `{ statusItemId: string }`, guard: Admin
- [ ] Добавить audit log (опционально): кто и когда менял статус

**Frontend:**
- [ ] В `CrmMemberFullDto` страница — dropdown для смены статуса
- [ ] Цветовой индикатор статуса по `statusItem.color`
- [ ] Confirm dialog перед сменой статуса

---

## P3 — Низкий приоритет (member LK, embed, тесты)

### TASK-017: `apps/web` — Member LK frontend

**Общее состояние:** требует отдельного детального аудита. Предположительно не завершён.

**`apps/web/middleware.ts`**
- [ ] По аналогии с CRM: проверка `member_access_token` cookie
- [ ] Redirect на `[portal]/auth/login` для member

**Member registration page**
- [ ] `GET /lk/auth/member/registration-schema` → динамическая форма по `FieldDefinition`
- [ ] `DynamicRegistrationForm` компонент в `@workspace/ui` или локально
- [ ] Submit → `POST /lk/auth/member/register` с dynamic payload

**Member profile page**
- [ ] `GET /lk/members/me` → отображение полей по `isVisibleInCabinet`
- [ ] `PATCH /lk/members/me` → редактируемые поля по `isEditableInCabinet`

**Orders history**
- [ ] `GET /lk/orders` → список заказов мембера

**Presence history**
- [ ] `GET /lk/presence` → история посещений

---

### TASK-018: Registration link & embed генератор

По playbook шаг 10.

**Backend:**
- [ ] `GET /crm/settings/registration-link` — возвращает public URL регистрации для портала
- [ ] `GET /crm/settings/embed-snippet` — возвращает iframe/JS snippet

**Frontend CRM settings:**
- [ ] Секция "Registration link" в settings page
- [ ] Copy to clipboard кнопка
- [ ] Preview embed code

---

### TASK-019: Cross-portal isolation тесты

**Файлы:** `apps/api/test/` или `apps/api/src/modules/portal/auth/__tests__/`

- [ ] E2E тест: employee portal A не может читать members portal B (`GET /crm/members` → 0 результатов при portalId B)
- [ ] E2E тест: member portal A не может авторизоваться с заголовком portal B → 403
- [ ] E2E тест: создание заказа в portal A не виден в portal B
- [ ] E2E тест: product из portal A не виден в portal B
- [ ] Unit тест: `PortalTenantMatchGuard` → 403 при mismatch

---

### TASK-020: Subscription status gate

По playbook Stage C.

**Backend:**
- [ ] Middleware или guard: проверять `PortalSubscription.status` при каждом CRM запросе
- [ ] Если `canceled` или `expired` — 402 с `{ message: "Subscription expired" }`
- [ ] Если `past_due` — предупреждение в response header `X-Subscription-Warning: past_due`
- [ ] Grace period: если `graceEndsAt` в будущем — пропускать с warning

**Frontend:**
- [ ] Banner в CRM shell при `past_due`
- [ ] Hard block при `expired` / `canceled` — отображать subscription expired page

---

## Порядок выполнения

```
Sprint 1 (P0 — data isolation):
  TASK-001 → TASK-002 → TASK-003 → TASK-004 → TASK-005 → TASK-006

Sprint 2 (P1 — функциональная полнота):
  TASK-007 → TASK-008 → TASK-009 → TASK-010 → TASK-011 → TASK-012

Sprint 3 (P2 — управление):
  TASK-013 → TASK-014 → TASK-015 → TASK-016

Sprint 4 (P3 — LK, тесты, billing):
  TASK-017 → TASK-018 → TASK-019 → TASK-020
```

---

## Definition of Done (весь multitenant)

- [ ] `Product` и `ProductCategory` имеют `portalId`, все queries скоупированы
- [ ] `StorageFile` имеет `portalId`
- [ ] JWT стратегии проверяют `revoked: false`
- [ ] Новый портал после регистрации имеет полный seed (EntityDefinition, StatusSet, FieldDefinition, FormDefinition)
- [ ] `apps/crm/middleware.ts` существует и защищает все CRM routes
- [ ] Portal slug валидируется server-side (несуществующий slug → 404)
- [ ] `GET/PATCH /crm/employees` работает с portalId scope
- [ ] Все CRM endpoints проверяют `resource.portalId === request.portalId`
- [ ] E2E тест cross-portal isolation проходит
- [ ] Нет localStorage для хранения auth токенов (проверить grep по кодовой базе)
- [ ] `apps/web` — member registration и profile работают через dynamic schema
- [ ] Subscription gate блокирует просроченные порталы
