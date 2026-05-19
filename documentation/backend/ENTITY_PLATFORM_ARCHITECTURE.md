# Entity-first ядро, платформа и биллинг

Этот документ фиксирует **целевую модель** после рефакторинга (Prisma + Nest). Детали по полям member см. также [MEMBER_AND_ENTITY_FIELDS.md](./MEMBER_AND_ENTITY_FIELDS.md) (обновлён под новую схему).

## Слои

| Слой | Содержимое |
|------|------------|
| **Платформа** | `GlobalEntityTemplate` и связанные шаблоны; `BillingPlan`, `PortalSubscription`, `Payment`; `PlatformAdmin` + отдельный JWT (`POST /platform/auth/login`, `Authorization: Bearer`); API `GET /platform/portals`. |
| **Портал** | `EntityDefinition` (код `member` \| `order` \| …), `EntityRecord`, `FieldDefinition` / `FieldOption`, `FieldValue` **только** через `entityRecordId` + `fieldDefinitionId`. Формы, статусы и воронки ссылаются на `entityDefinitionId`. |
| **Мост Member** | `Member.userId` + `Member.entityRecordId` → профильная запись типа `member`. Статус жизненного цикла на **`EntityRecord.statusItemId`**. Документы, подпись, MJ-связи, QR, presence, часть финансов — по **`entityRecordId`**. |
| **Заказы** | `Order.customerEntityRecordId` → `EntityRecord` (клиент-участник). В API домена по-прежнему удобно оперировать `memberId` (мост), в БД — запись сущности. |

## Провижининг

При регистрации портала вызывается **`ProvisionPortalFromTemplatesService.provisionPortal`**: поднимаются глобальные шаблоны (если пусто), материализуются `EntityDefinition` и зависимости по `Portal.type`, создаётся trial **`PortalSubscription`** на план `trial`.

## Биллинг и CRM

- Флаги возможностей портала: JSON **`BillingPlan.featuresJson`** (например `{ "crm": true }`).
- **`PortalCrmSubscriptionGuard`** включается в цепочку `RequireEmployeeJwt` / `RequireEmployeeJwtMobile` / `RequireEmployeeAdmin`: блокирует CRM при `expired` / `canceled` и после окончания `graceEndsAt` для `past_due`.
- Cron **`BillingCronService`**: ежечасно `past_due` + истёкший grace → `expired` + `Portal.status = suspended`.

## Сид супер-админа

`pnpm prisma:seed:admin` / `PLATFORM_BOOTSTRAP_ENABLED` (или legacy `BOOTSTRAP_ADMIN_ENABLED`): создаётся **`User`** без `portalId` и **`PlatformAdmin`**, не `Employee`. Переменные: `PLATFORM_BOOTSTRAP_EMAIL` / `PLATFORM_BOOTSTRAP_PASSWORD` или `BOOTSTRAP_ADMIN_*`.

## Кодовая раскладка Nest

- `src/core/core.module.ts` — точка расширения ядра.
- `src/modules/crm/crm.module.ts` — агрегатор CRM/порталов.
- `src/modules/platform/platform.module.ts` — платформенная аутентификация и API.

## Миграции

Единая миграция: `prisma/migrations/20260328140000_entity_first_platform/migration.sql`. Для локальной БД без сохранения данных: `pnpm prisma migrate reset`.
