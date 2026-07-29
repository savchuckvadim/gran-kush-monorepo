# Flexible entities (смарт-процессы): аудит 2026-07-29

Срез кода: коммит `8bdfb72`, ветка `tenant-crm`. Сверка `FLEXIBLE_CRM_DOMAIN_TASKS.md` с реальным кодом.

> **Обновление 2026-07-29 (вечер):** P0-блокеры из §2 закрыты, безопасное легаси из §4 удалено
> (кроме users CRUD и apps/admin). Кастомная сущность теперь создаётся рабочей end-to-end:
> дефолтные формы crm_create/crm_detail + поле title + воронка при `POST /crm/entities`;
> CRUD воронок и статусов (API + UI-табы «Стадии»/«Статусы»); добавление полей в форму
> из forms-tab; динамические пункты меню. Покрыто e2e: `test/custom-entities.e2e-spec.ts`.
> Актуальными остаются разделы P1 (§3), спорное легаси (§4: users CRUD, apps/admin),
> эпики G/H/I (§5) и рефакторинги (§6).

## 1. Смарт-процессы — что есть

EAV-ядро построено полностью: `EntityDefinition`, `FieldDefinition`/`FieldOption`,
`EntityRecord`, `FieldValue`, `RecordRelation`, `FormDefinition`/`FormDefinitionItem`,
`StatusSet`/`StatusItem`, `StageCategory`/`Stage`, глобальные `Global*Template` для провижининга.

Работает end-to-end:

- `POST /crm/entities` — создание определения (AdminGuard)
- CRUD полей и опций по `:code` (`crm-entity-fields-settings.controller`)
- `PATCH /crm/settings/entities/:code/forms/:purpose` — layout форм
- Полный CRUD записей + стадии + статус + связи + фильтры (`crm-entity-records.controller`)
- UI: `/crm/settings/entities` (+`[code]`: табы Поля/Формы/Стадии), `/crm/entities/[code]` (таблица+канбан)

EAV реально хранит значения **только для member и employee**. Для order/product
мост `entityRecordId` есть, но field values не пишутся (`ORDER_TEMPLATE.fields = []`,
`PRODUCT_TEMPLATE.fields = []`).

Legacy-колонок на `Member` больше нет — миграция на EAV завершена (§1 старого дока устарел).

## 2. Блокеры произвольных сущностей (P0)

1. **Форму новой сущности нельзя наполнить из UI.** `forms-tab.tsx` строит строки только
   из существующей схемы; для новой сущности `FormDefinition` нет → `form-schema` 404 →
   сохранить нельзя → `EntityRecordsService.create` тоже падает на 404.
   **Создать запись кастомной сущности через UI сегодня невозможно.**
   Фикс: при `POST /crm/entities` создавать дефолтные `FormDefinition(crm_create/crm_detail)`,
   поле `title`, воронку default; в forms-tab — контрол «добавить поле» + обработка 404.
2. **Стадии не создаются.** `OrderStagesService.createStageCategory` написан, но не подключён
   ни к одному контроллеру; `stages-tab.tsx` read-only; канбан кастомной сущности пуст.
3. **Статусов для кастомных сущностей нет.** Нет CRUD `StatusSet`/`StatusItem` (ни API, ни UI);
   единственный endpoint — `member/status-items`. `PATCH .../records/:id/status` есть, но ссылаться не на что.
4. **Навигация статическая** (`processes/navigation/crm/data.tsx`) — записи смарт-процесса
   доступны только по прямому URL.

## 3. P1

- Поля типа `relation` создаются сломанными: `relationTargetEntityDefinitionId` не задаётся,
  контракты валидатора и records-сервиса расходятся (строка vs массив id).
- `crm/entities`: только list/create; нет PATCH/DELETE/деактивации, `icon`/`color` не задаются,
  P2002 → 500 вместо 409.
- Права: CRUD записей — любой сотрудник (`@RequireEmployeeJwt()` без ролей).
- Карточка member не на динамических формах: `member-profile-edit-modal.tsx` хардкодит ядровые
  поля — кастомные поля портала не редактируются. Перевести на `FormPurpose.crm_detail` + dynamic-forms.
- Статус заказа выводится из **имени** стадии (`stage.name.toLowerCase()` + `ORDER_STATUS_TO_STAGE_NAME`)
  — переименование стадии ломает статусы. Нужен стабильный ключ (`Stage.code`/`semantic`).

## 4. Легаси на удаление

| Что | Где | Примечание |
|---|---|---|
| Модель `StorageFile` | `schema.prisma:932` + связи Portal/User | Кодом не используется; закрывает TASK-021. Нужна миграция |
| Дубли DTO users | `modules/users/dto/*` (4 файла) | Полный дубль `users/api/dto`, импортов нет |
| `IUserRepository` | `users/application/interfaces/user-repository.interface.ts` | 0 использований |
| Глобальный CRUD `/users` | `users.controller.ts` + CRUD-часть `users.service.ts` | Мёртвый код **и** дыра (без portal-скоупа). ⚠️ вместе с ним уйдут недавно восстановленные юнит-тесты |
| `portal-entity-metadata.service.ts` | entity-fields | Помечен `@deprecated` |
| `SYSTEM_ENTITY_CODES` | `entity-definition-codes.ts:12` | 0 использований |
| `apps/api/docker-compose-dev.yml` | — | Вытеснен `infra/compose/docker-compose.dev.yml` |
| `generate:local` + dep `openapi-typescript-codegen` | `packages/api-client/package.json` | Пишет в несуществующий `src/generated` |
| `packages/api-client/src/contracts/` | — | Пустая директория |
| `fake-data-notes.tsx` | `apps/crm/modules/widgets/member/time-line/` | Фейковые данные в прод-сборке |
| Копипаста в `apps/admin` | `modules/pages/member*`, `processes/navigation/crm/*` | Не подключена к роутам; admin — заглушка (только auth) |

Мелочь: `apps/web/package.json` содержит UTF-8 BOM — ломает `pnpm --filter web exec …`.

## 5. Статус эпиков старого дока

| Эпик | Статус | Ключевой пробел |
|---|---|---|
| A. Embed/интеграция | PARTIAL | Нет iframe-snippet, revoke ссылок, подписанных returnUrl; reg-links жёстко member |
| B. Поля | DONE (хвосты) | relation-target; `hidden/labelOverride/...` не редактируются; нет GIN-индексов под EAV-фильтры |
| C. Статусы | PARTIAL | Нет CRUD/UI; только member_lifecycle; `Order.paymentStatus` — свободная строка |
| D. Настройки портала | PARTIAL | Только профиль клуба; нет обязательных документов, модулей, ui_config |
| E. Продукты | PARTIAL | `portalId` есть; **нет `kind` (товар/услуга)**, нет сидов категорий/единиц |
| F. UI-конфиг | PARTIAL | FormDefinition есть; нет конфига колонок/карточек/фильтров |
| G. Склад-ledger | MISSING | `adjustQuantity` правит остаток напрямую, журнала нет |
| H. Снапшоты/архив товара | MISSING | `OrderItem` без снапшота name/sku; hard delete товара упадёт на FK → 500 |
| I. Heatmap посещаемости | MISSING | Нет endpoint диапазона и компонента |
| J. Seeds/платформа | PARTIAL | Провижининг работает; `apps/admin` — заглушка |

## 6. Рефакторинги (сверх P0/P1 выше)

- 9 контроллеров ходят в `PrismaService` напрямую (platform, portals, public/lk-*);
  модуль `portal/public` состоит из одного `api/`.
- Течь Prisma-типов из сервисов: `order-stages`, `portal-field-settings`, `form-schema`,
  `entity-records` (`Prisma.*GetPayload`/`WhereInput` в контрактах).
- DTO с именами `Member*` на универсальных маршрутах `:code` → переименовать в `Entity*`.
- Дублирующийся `GET /crm/members/form-schema` vs `/crm/settings/entities/member/form-schema/:purpose`.
- Резолв `entityDefinitionId` по `(portalId, code)` скопирован в 7 сервисах → общий `EntityDefinitionResolver`.
- ЛК возвращает `CrmMemberFullDto` (вместе с внутренним `notes`) → отдельный `LkMemberDto`.
- Крупные сервисы: `entity-records.service` 484 стр., `orders.service` 442, `members.service` 403.
- Юнит-тестами покрыт только users-модуль (кандидат на удаление); ядро EAV — не покрыто.
