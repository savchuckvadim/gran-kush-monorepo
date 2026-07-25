# Multitenant: план задач

Дата анализа: 2026-07-25 (первичный аудит: 2026-05-19)
Ветка: `tenant-crm`
Статус: ~90% готовности к production multitenant. P0 закрыт полностью, P1 закрыт, из P2/P3 остались точечные задачи.

---

## Легенда статусов

- `[ ]` — не начато
- `[~]` — в процессе / частично
- `[x]` — завершено

---

## Обзор состояния

### Что готово (проверено по коду 2026-07-25)

- [x] Prisma schema: `Portal`, `portalId` во всех бизнес-сущностях, включая `Product`, `ProductCategory` (c `@@unique([portalId, ...])`), `StorageFile.portalId`
- [x] Dual auth (Member / Employee), web-cookies + mobile-bearer, refresh rotation, `revoked: false` проверяется при refresh (`refresh-token.repository.ts`); access-токены stateless 15 мин by design
- [x] `PortalContextMiddleware` + `PortalTenantMatchGuard` + `@PortalId()` — подключены глобально (фикс «middleware never ran» — `5b1db29`)
- [x] Presence: все endpoints скоупятся по порталу (`82ffe0b`)
- [x] QR-коды: get/generate/revoke/scan скоупятся по порталу; скан чужого QR → `valid: false` (2026-07-25, ветка `fix/storage-portal-scope`)
- [x] Subscription gate: 402 при `canceled`/`expired`, grace-период с header `X-Subscription-Warning: past_due` (`c56f616`)
- [x] Provisioning нового портала из шаблонов работает (e2e-suite опирается на provisioned `member` definition)
- [x] `apps/crm/middleware.ts` — edge-защита CRM routes; `apps/web/proxy.ts` — защита LK (`57222d2`)
- [x] Server-side валидация portal slug: `GET /crm/portals/resolve?slug=` + `notFound()` в `[portal]/layout.tsx`
- [x] `CrmEmployeesController` + страница `/crm/employees` + форма добавления сотрудника (`598b67a`)
- [x] Settings UI: `/crm/settings` (entities-конструктор, invitations, registration-links) + `crm-entity-fields-settings.controller` (`702ad1b`)
- [x] Registration links: модуль `registration-links` (CRM + public контроллеры)
- [x] Multi-portal accounts: единый глобальный аккаунт, member-мосты по порталам, unified EAV core (`1762e7f`)
- [x] `@workspace/dynamic-forms` — общие динамические формы, используются в web (join/clubs) (`cf6c809`)
- [x] E2E cross-portal isolation suite: `apps/api/test/tenant-isolation.e2e-spec.ts` — members, presence, QR, файлы, subscription gate, multi-portal bridge

### Архитектурное решение по файлам (замена старой TASK-002)

Файлы участников — **аккаунт-уровневые** (`accounts/{userId}`, приватный S3), а не портальные:
документы и подпись принадлежат глобальному аккаунту и переиспользуются между клубами.
Изоляция обеспечивается на точке доступа: CRM preview-endpoints резолвят участника через
`findByIdForPortal(memberId, portalId)` и сверяют `doc.userId === member.userId`.
Модель `StorageFile` кодом не используется (мёртвая) — метаданные файлов живут в
`UserDocument` / `UserSignature`. При рефакторинге можно удалить модель или начать вести в ней учёт.

Нескоупленный `findByIdUnscoped` удалён из `MemberRepository`/`MembersService` (2026-07-25) —
все выборки участников требуют `portalId`.

---

## Открытые задачи

### TASK-015: Portal info в CRM Shell — `[~]`

Portal switcher в CRM есть, но выделенного `GET /crm/portal/info` (displayName, type, subscription status) не найдено.

- [ ] `GET /crm/portal/info` — `{ portalId, name, displayName, type, status, subscription { status, planName } }`
- [ ] Banner в CRM shell при `past_due` (backend-заголовок уже есть), hard-block страница при 402

### TASK-016: Member status update из CRM — `[ ]`

Отдельного endpoint смены статуса не найдено (сейчас — только через общий PATCH).

- [ ] `GET /crm/members/statuses` — статусы портала (StatusSet + StatusItem)
- [ ] `PATCH /crm/members/:id/status` — `{ statusItemId }`, guard Admin
- [ ] Frontend: dropdown смены статуса + цвет + confirm

### TASK-021: Убрать/задействовать модель `StorageFile` — `[ ]`

- [ ] Решить: удалить модель из schema или начать вести учёт загрузок (портал+аккаунт) в ней
- [ ] Если ведём учёт — писать записи из `AccountFilesService` / member-files queue

### TASK-022: Расширение e2e изоляции — `[~]`

Покрыто: members, presence, QR, файлы (preview), subscription gate.

- [ ] Orders: заказ портала A невиден в портале B
- [ ] Catalog: product портала A невиден в портале B
- [ ] Entity-fields settings: field definitions не пересекаются между порталами

---

## Definition of Done (весь multitenant)

- [x] `Product` и `ProductCategory` имеют `portalId`, все queries скоупированы
- [x] Файловая изоляция: доступ к документам/подписи только через portal-scoped member lookup
- [x] Refresh-токены проверяют `revoked: false`; ротация на каждый refresh
- [x] Новый портал получает полный seed (EntityDefinition, StatusSet, FieldDefinition, FormDefinition)
- [x] `apps/crm/middleware.ts` существует и защищает CRM routes; `apps/web/proxy.ts` защищает LK
- [x] Portal slug валидируется server-side (несуществующий slug → 404)
- [x] `GET/PATCH /crm/employees` работает с portalId scope
- [x] Все CRM endpoints проверяют принадлежность ресурса порталу (members, presence, QR, orders, catalog)
- [x] E2E тест cross-portal isolation проходит
- [x] Нет localStorage для хранения auth токенов
- [x] `apps/web` — member registration через dynamic schema (`@workspace/dynamic-forms`)
- [x] Subscription gate блокирует просроченные порталы (402 + grace)
- [ ] Frontend-обработка 402 (banner / expired page) — см. TASK-015
