# Member, поля (user fields), статусы и стадии — entity-first

Документ описывает **актуальную** реализацию в `apps/api` после перехода на модель **EntityDefinition → EntityRecord → FieldValue**. Обзор платформы, биллинга и провижининга: [ENTITY_PLATFORM_ARCHITECTURE.md](./ENTITY_PLATFORM_ARCHITECTURE.md).

---

## 1. Кратко

| Область | Состояние |
|--------|------------|
| Мост `Member` | `userId`, `portalId`, `entityRecordId` (1:1 с профильной **`EntityRecord`** типа `member`), `membershipNumber`, `isActive`. |
| Статус жизненного цикла | **`EntityRecord.statusItemId`** → `StatusItem` в наборе `member_lifecycle`, привязанном к **`EntityDefinition`** с кодом `member`. |
| Определения полей | **`field_definitions`** (+ `field_options`), привязка к **`entity_definition_id`** (не enum в Prisma). |
| Значения | **`field_values`**: `entity_record_id`, `field_definition_id`, `value_index`, `value_json`, денорм `portal_id`. |
| Формы | `form_definitions`: `(portalId, entityDefinitionId, purpose)`; элементы ссылаются на `field_definition_id`. |
| Статусы / стадии | `status_sets` / `status_items` и `stage_categories` / `stages` — через **`entityDefinitionId`**. |
| Сид портала | **`ProvisionPortalFromTemplatesService`** (через `PortalEntityMetadataService.seedForPortal`) из глобальных шаблонов + trial-подписка. |
| Документы / QR / presence | FK на **`entity_record_id`** (профиль участника). |

---

## 2. Связь Member с полями

- Профильные атрибуты лежат в **`field_values`** строки **`EntityRecord`**, на которую указывает `Member.entityRecordId`.
- В коде CRM по-прежнему часто передаётся **`memberId`**; сервисы резолвят `entityRecordId` для записи в БД.

---

## 3. Настройки CRM

HTTP API: `crm/settings/entities/...` — работа с полями **member** идёт через `EntityDefinition` с кодом `member` (константа `ENTITY_DEFINITION_CODES` в коде).

---

## 4. Регистрация member

Динамическая валидация по форме `public_registration` для сущности с кодом **`member`** (`DynamicPayloadValidatorService` + `FormSchemaService.getFormSchema(portalId, 'member', purpose)`).

---

## 5. Поля, статусы и стадии (как сейчас устроено)

### Поля (fields)

- **`FieldDefinition`** живёт на **`entityDefinitionId`**: ключ (`fieldKey`), тип, лейбл, обязательность, порядок и т.д.; опции списков — **`FieldOption`**.
- Значения только в **`FieldValue`**: `entityRecordId` + `fieldDefinitionId`, `value_json` (+ при необходимости `value_index`).
- **`FormDefinition`** + элементы формы привязаны к той же сущности (`entityDefinitionId`) и цели (`FormPurpose`: регистрация, CRM и т.д.). Публичная регистрация member валидируется через **`DynamicPayloadValidatorService`** по схеме формы.
- Код по-прежнему часто знает «жёсткие» ключи member (`MEMBER_FIELD_KEYS`); для кастомных сущностей опора — на определения в БД и общие сервисы полей.

### Статусы (status sets)

- **`StatusSet`** привязан к **`entityDefinitionId`** (и порталу); внутри него **`StatusItem`** с `key`, лейблом, порядком.
- У **записи** участника жизненный цикл фиксируется полем **`EntityRecord.statusItemId`** (например набор с кодом вроде `member_lifecycle` для сущности `member`).
- Отдельно от этого остаётся **платформенный справочник `MjStatus`** + связь **`MemberMjStatus`** (по `entityRecordId`): флаги medical / mj / recreation. Значения по умолчанию задаются JSON + идемпотентный сид (**`ensureMjStatusDefaults`**, вызов с CRM при синке флагов и **`POST /platform/system/reference-data`** для платформенного админа, плюс шаг в `prisma:seed:admin`). Это не замена `StatusSet`, а отдельная ось под текущую продуктовую логику.

### Стадии (stages / воронка)

- **`StageCategory`** на **`entityDefinitionId`** (воронка для заказов и т.п.); внутри **`Stage`** с именем, цветом и **`StageSemantic`** (смысловая метка: pending, confirmed, cancelled и т.д.).
- У **`Order`** есть **`stageId`** и денормированное строковое **`status`**: в репозитории статус для домена может выводиться из имени стадии или из поля `status` в БД (нужно держать в согласованности с настройками портала).
- Смена стадий/статусов заказа идёт через сервисы CRM, опираясь на стадии сущности **order** для данного портала.

---

## 6. Что осталось до «идеала»

- **Один источник правды для заказа**: явно зафиксировать правило «только `Stage` / только `Order.status` / гибрид» и убрать расхождения в UI и отчётах; при необходимости генерировать `status` из стадии или наоборот в одном месте.
- **Mj и статусы**: либо перенести флаги в `FieldValue` +/или в `StatusSet`/мультистатус, либо формально описать `MjStatus` как часть платформенной модели и не дублировать смысл в полях.
- **Универсальный CRM**: полноценный CRUD **`EntityRecord`** и настройка полей/форм/статусов/воронок для **любой** `EntityDefinition`, а не только member/order в разрозненных экранах.
- **Админка и API**: закрыть пробелы по REST для редактирования `StatusSet`/`StageCategory` там, где сейчас остаётся прямой Prisma или неполный набор эндпоинтов.
- **Конвенции ключей**: по возможности сузить использование захардкоженных `fieldKey` в пользу конфигурации из БД + документированных кодов сущностей.
- **Локализация и версионирование**: лейблы статусов/стадий/полей из БД с учётом языка портала; при необходимости история изменений схемы.

Общая архитектура платформы и провижининг: [ENTITY_PLATFORM_ARCHITECTURE.md](./ENTITY_PLATFORM_ARCHITECTURE.md).
