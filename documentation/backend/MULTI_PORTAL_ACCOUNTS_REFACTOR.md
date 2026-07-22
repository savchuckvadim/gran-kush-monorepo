# Multi-Portal Accounts & Universal Entities — Refactor (2026-07)

Крупный рефакторинг ядра: single-portal клуб → multi-tenant Bitrix-подобная платформа.
БД пересоздана с нуля (одна init-миграция), обратной совместимости нет.

## Ключевые архитектурные решения

### 1. Глобальный аккаунт `User`
- `User` больше **не привязан к порталу** (убран `User.portalId`).
- Поля: `email @unique`, `passwordHash: String?` (null → `pending_claim`), `status: UserAccountStatus (active|pending_claim|blocked)`, `displayName?`.
- Один `User` может быть **member в N клубах** и **employee в M порталах** одновременно.

### 2. Мосты membership
- `Member(userId, portalId, entityRecordId, @@unique([userId, portalId]))` — профиль в `FieldValue`.
- `Employee(userId, portalId, entityRecordId, role: EmployeeRole, @@unique([userId, portalId]))` — колонок name/phone/position больше нет, всё в `FieldValue` (fieldKey: `first_name`, `last_name`, `phone`, `position`, `department`).
- `joinSource` (self|registration_link|kiosk|crm), `claimedAt`, `createdByEmployeeId` на Member.

### 3. Единый EAV-паттерн для всех сущностей
- Системные (`member`, `employee`, `order`, `product`) и пользовательские (смарт-процессы) — всё через `EntityDefinition → EntityRecord → FieldValue`.
- `Order.entityRecordId`, `Product.entityRecordId` добавлены; `Order.status` (строка) **удалён** — единственный источник правды `EntityRecord.stageId → Stage`.
- `Order.customerEntityRecordId` заменён на `Order.memberId`.
- `RecordRelation` — связи записей (`FieldDefinition.type = relation`) с referential integrity вместо `valueJson`.

### 4. Auth: глобальный JWT + контекст портала
- JWT payload: `{ sub: userId, email, type: member|employee }` — **без portalId**.
- `MembershipGuard` (заменил `PortalTenantMatchGuard`): после JWT резолвит Member/Employee по `(userId, portalId из X-Portal-*)`, 403 если нет активного membership; `req.principal = PortalPrincipal`, `req.user` = bridge-сущность.
- Декораторы: `@RequireMemberJwt`/`@RequireEmployeeJwt` (портальные, с MembershipGuard) и `@RequireUserJwt`/`@RequireEmployeeUserJwt` (глобальные, без membership — для «мои клубы», аккаунт-документов).
- `@RequireEmployeeAdmin()` + `@Admin()` для admin/portal_owner эндпоинтов (**важно:** не комбинировать два class-level `@UseGuards` — перезаписывают друг друга).
- Три таблицы токенов (Token/EmployeeToken/PlatformAdminToken) объединены в одну `RefreshToken(principalType, userId?, platformAdminId?)`.
- Переключение портала — клиентское (сегмент `[portal]` в URL → заголовок), без релогина.

### 5. Документы и подпись на уровне аккаунта
- `UserDocument(userId, type, side, storagePath)` и `UserSignature(userId @unique)` заменили портальные `IdentityDocument`/`Signature`.
- Переиспользуются между клубами: при вступлении поле типа `document`/`signature` принимает `{ fromAccount: true }`.
- Модуль `modules/account` — `GET/POST/DELETE /lk/account/documents`, `PUT /lk/account/signature`.
- Удалены модели: `MjStatus`, `MemberMjStatus`, `Document`, `MemberDocument`, `IdentityDocument`, `Signature`.

## Новые фичи и эндпоинты

| Область | Эндпоинты |
|---------|-----------|
| Мои клубы / вступление | `GET /lk/portals`, `POST /lk/portals/:slug/join` |
| Мои порталы (CRM) | `GET /crm/my-portals` |
| Глобальный аккаунт | `GET /lk/auth/me` (memberships), `GET /crm/auth/me` (employments) |
| Регистрация | `POST /lk/auth/member/register` `{email,password,fields?}` — глобальная + join если есть X-Portal-*; клейм `pending_claim` |
| Инвайты сотрудников | `POST/GET/DELETE /crm/settings/invitations`, `GET/POST /public/invitations/:token[/accept]` |
| Ссылки-формы регистрации | CRUD `/crm/settings/registration-links`, `GET/POST /public/reg-links/:token[/register]` |
| Универсальный CRUD записей | `/crm/entities/:code/records` (+ `/:id/stage`, `/:id/status`), фильтры `?fields[key]=val` |
| Конструктор полей/форм/стадий | `/crm/settings/entities/:code/{fields,forms/:purpose,filter-fields,stage-categories,form-schema/:purpose}` |
| Карта клубов / рейтинги | `GET /public/portals/map`, `GET /public/portals/:slug`, `PUT /lk/reviews/portals/:id`, `PUT /lk/reviews/products/:id` |
| Кросс-клубные траты | `GET /lk/spending` |
| Настройки портала (гео/публичность) | `GET/PATCH /crm/settings/portal` |

## Провижининг
- Сиды глобальных шаблонов вынесены из кода в `src/common/reference-data/global-templates.seed.ts` (`ensureGlobalEntityTemplates`), вызывается из `prisma:seed:admin` и рантайм-провижининга.
- Шаблоны: `member`, `employee`, `order` (воронка default), `product`.

## Фронтенд
- `packages/dynamic-forms` (`@workspace/dynamic-forms`): общий `DynamicFormFields` + `validateDynamicValues`/`toSubmitPayload`, инжектируемый рендер файловых полей.
- apps/web: глобальная регистрация, `(site)/clubs` + `[slug]` (вступление), `(site)/join/[token]`, `profile/{clubs,documents,spending}`.
- apps/crm: переключатель порталов, конструктор полей/форм, записи смарт-процессов, инвайты, генератор ссылок-форм.

## Проверено (smoke-test API)
Регистрация 2 порталов → глобальная регистрация member → вступление в 2 клуба (главный инвариант) → дубль-join 409 → изоляция тенантов (owner A → 403 для портала B) → employee EAV-профиль → смарт-процесс (сущность+поле+форма+запись) → инвайт (создать→инфо→принять) → ссылка-форма.
