# RLS в Postgres: пошаговая задача

Дата составления: 2026-08-21. Ветка: `main`.
Разворачивает строку «**RLS в Postgres** поверх текущей схемы» из
[backend/IDEMPOTENCY_AND_SCALING.md §5.2](../backend/IDEMPOTENCY_AND_SCALING.md) и закрывает
первый пункт [TASK-114](./scaling-roadmap.md).

Обратная совместимость не требуется: проект не запущен, БД можно сбрасывать (`prisma migrate reset`).
Поэтому все схемные шаги делаются «как правильно», без backfill-акробатики.

---

## 1. Что решаем и чего НЕ решаем

**Модель угрозы — забытый `where portalId` в коде.** Сейчас изоляция держится на дисциплине:
43 файла инжектят `PrismaService`, каждый запрос обязан сам добавить `portalId`. Одна забытая
строка в новом репозитории — и данные чужого клуба уехали в ответ. `PortalContextMiddleware` +
`MembershipGuard` проверяют **кто и в каком портале пришёл**, но не то, что именно вернул SQL.
RLS переносит проверку в БД: строка чужого портала физически не попадёт в результат.

RLS **не решает** и не отменяет:

| Не решает | Кто решает |
|---|---|
| Роли внутри портала (`employee` не должен править каталог) | `EmployeeRolesGuard` / `AdminGuard`, [TASK-023](./multitenant.md) |
| Разграничение «участник видит только свои данные» внутри портала | сервисы + guard'ы |
| Изоляцию аккаунт-уровневых файлов (`user_documents`, `user_signatures`) | portal-scoped member lookup, [решение по файлам](./multitenant.md) |
| Гонки, дубли, идемпотентность | [scaling-roadmap](./scaling-roadmap.md), P0–P2 |
| Масштабирование | реплики, [§5.1](../backend/IDEMPOTENCY_AND_SCALING.md) |

**Явные `where portalId` в коде остаются.** RLS — страховочная сетка, а не замена фильтрации:
без явного условия планировщик хуже выбирает индексы, а баг становится невидимым (вместо ошибки
получаем тихо пустой список). Правило: код фильтрует, БД гарантирует.

---

## 2. Ключевые архитектурные решения (принять до начала)

### 2.1 Две роли Postgres вместо GUC-флага bypass

| Роль | Кто использует | RLS |
|---|---|---|
| `gran_kush_owner` | `prisma migrate deploy`, `rls:apply`, seed, **системный клиент** | владелец таблиц → политики **не применяются** |
| `gran_kush_app` | runtime API (HTTP, воркеры с портальным контекстом) | не владелец, без `BYPASSRLS` → политики применяются |

Альтернатива — один пользователь и «дырка» через `current_setting('app.bypass_rls')` — отвергнута:
флаг может выставить любой участок кода, а значит гарантия снова держится на дисциплине.
Разные роли дают escape hatch, который видно в DI (`PrismaSystemService`), легко грепается
и запрещается ESLint-правилом.

Следствие: **`FORCE ROW LEVEL SECURITY` не включаем**. Владелец обязан обходить политики —
на этом построены провижининг, кроны и платформенная админка. Плюс это даёт мгновенный откат:
переключить `DATABASE_URL` на owner-роль, и система работает как раньше.

### 2.2 Контекст — транзакционный GUC, не сессионный

`SET LOCAL app.portal_id` живёт до конца транзакции и не протекает в следующий запрос,
который возьмёт то же соединение из пула. Сессионный `SET` в пуле соединений — это утечка
между арендаторами; использовать нельзя ни при каких обстоятельствах.
Транзакционный вариант дополнительно совместим с pgBouncer в transaction mode — пригодится,
когда дойдём до [TASK-115](./scaling-roadmap.md).

Цена: каждый ORM-вызов превращается в `BEGIN; select set_config(...); query; COMMIT` —
четыре round-trip вместо одного. Для CRM-нагрузки это единицы миллисекунд, но замерить нужно
(см. [шаг 9](#шаг-9--нагрузочная-проверка-и-индексы)).

### 2.3 `portal_id` денормализуется во все дочерние таблицы

Политика должна быть сравнением колонки: `portal_id = current_portal_id()`. Политика через
`EXISTS (SELECT ... FROM parent)` тянет за собой политики родителя, даёт вложенную проверку
на каждой строке и убивает планы запросов. Поэтому девять дочерних таблиц получают собственный
`portal_id`, а не наследуют его через join.

---

## 3. Инвентаризация таблиц (43 модели)

### 3.1 Уже имеют `portalId` — политика без изменений схемы (19)

`members`, `employees`, `portal_subscriptions`, `payments`, `entity_definitions`, `entity_records`,
`status_sets`, `form_definitions`, `field_values`, `record_relations`, `stage_categories`,
`registration_links`, `employee_invitations`, `portal_reviews`, `product_reviews`,
`product_categories`, `products`, `orders`, `financial_transactions`

### 3.2 Нужно добавить `portalId` (10)

| Таблица | Родитель, от которого берётся portal_id |
|---|---|
| `status_items` | `status_sets` |
| `field_definitions` | `entity_definitions` |
| `field_options` | `field_definitions` |
| `form_definition_items` | `form_definitions` |
| `stages` | `stage_categories` |
| `qr_codes` | `entity_records` |
| `presence_sessions` | `entity_records` |
| `product_images` | `products` |
| `order_items` | `orders` |
| `measurement_units` | **нет родителя** — см. ниже |

**`measurement_units` — отдельный случай и заодно найденный дефект.** Таблица глобальная, но
у CRM есть write-эндпоинты и флаг `isCustom`: единица измерения, заведённая клубом A, сейчас
видна клубу B. Решение: `portalId String?` — `NULL` означает строку общего справочника,
не-`NULL` — кастомную единицу портала. Политика: читать можно `portal_id IS NULL OR = current`,
писать только `portal_id = current` (общий справочник наполняется owner-ролью при провижининге).

### 3.3 Глобальные таблицы — RLS не включается (14)

`portals`, `users`, `user_documents`, `user_signatures`, `platform_admins`, `refresh_tokens`,
`billing_plans`, `global_entity_templates`, `global_field_templates`, `global_field_option_templates`,
`global_status_set_templates`, `global_status_item_templates`, `global_stage_category_templates`,
`global_stage_templates`

`users` / `user_documents` / `user_signatures` — аккаунт-уровневые **по принятому решению**:
один глобальный аккаунт переиспользуется между клубами, документы и подпись принадлежат ему.
Включение RLS на них сломало бы логин (поиск по email идёт без портального контекста) и
мульти-портальные экраны. Изоляция этих данных остаётся на точке доступа —
CRM резолвит участника через `findByIdForPortal` и сверяет `doc.userId === member.userId`.
Список глобальных таблиц фиксируется в коде как allowlist: новая модель без `portalId`,
не внесённая в него, **роняет генератор политик** (шаг 4).

---

## Шаг 1 — TASK-201: схема, `portal_id` в дочерних таблицах `[ ]`

- [ ] добавить `portalId String @map("portal_id")` + связь с `Portal` в 9 таблиц из §3.2
- [ ] `measurement_units`: `portalId String? @map("portal_id")`
- [ ] на каждой таблице индекс с `portal_id` **первой колонкой**; существующие индексы
      (`@@index([entityRecordId])`, `@@index([orderId])` и т.п.) переписать на составные
      `@@index([portalId, entityRecordId])` — под RLS предикат по порталу есть в каждом запросе
- [ ] уникальные ключи дочерних таблиц расширить порталом там, где ключ должен быть портальным:
      `@@unique([portalId, statusSetId, key])` вместо `@@unique([statusSetId, key])` и аналогично
      для `field_definitions`, `field_options`, `form_definition_items`
- [ ] `measurement_units.code`: `@unique` → `@@unique([portalId, code])`, иначе клуб не заведёт
      единицу с кодом, который занят чужим клубом
- [ ] заодно закрыть [TASK-108](./scaling-roadmap.md): `@@unique([portalId, orderNumber])` на `orders`
- [ ] заодно закрыть [TASK-109](./scaling-roadmap.md): частичный уникальный индекс
      `CREATE UNIQUE INDEX ... ON presence_sessions (portal_id, entity_record_id) WHERE exited_at IS NULL`
      (raw SQL внутри миграции — Prisma частичные индексы не выражает)
- [ ] миграция: `ADD COLUMN` → `UPDATE ... FROM parent` (для локальных данных) → `SET NOT NULL`
- [ ] `prisma migrate reset` в dev, проверить провижининг нового портала

**Готово, когда:** `pnpm --filter api prisma:migrate` проходит, `pnpm --filter api typecheck` зелёный,
все места, где создаются дочерние сущности, проставляют `portalId` (компилятор их сам покажет).

---

## Шаг 2 — TASK-202: роли Postgres и два URL `[ ]`

- [ ] SQL-скрипт `prisma/rls/roles.sql`: создать `gran_kush_app` с `LOGIN`, без `BYPASSRLS`,
      без владения таблицами; выдать `USAGE` на схему, `SELECT/INSERT/UPDATE/DELETE` на все таблицы,
      `USAGE, SELECT` на последовательности
- [ ] `ALTER DEFAULT PRIVILEGES FOR ROLE gran_kush_owner IN SCHEMA public GRANT ... TO gran_kush_app` —
      иначе каждая новая таблица из миграции будет недоступна runtime-роли
- [ ] `REVOKE CREATE ON SCHEMA public FROM PUBLIC` — app-роль не должна уметь подменять
      функции контекста из шага 3
- [ ] owner-роль (`gran_kush_owner`) владеет схемой и имеет `CREATEDB` — иначе `prisma migrate dev`
      не создаст shadow database
- [ ] `.env`: `DATABASE_URL` → app-роль (runtime), новый `DATABASE_OWNER_URL` → owner
- [ ] `prisma.config.ts`: `url: process.env["DATABASE_OWNER_URL"] ?? process.env["DATABASE_URL"]`
- [ ] `PrismaService` продолжает читать `DATABASE_URL`; новый `PrismaSystemService` — `DATABASE_OWNER_URL`
      с маленьким пулом (`max: 5`)
- [ ] dev-инфра: `infra/compose/docker-compose.dev.yml` — смонтировать init-скрипт в
      `/docker-entrypoint-initdb.d/`, чтобы `pnpm docker:dev` сразу поднимал обе роли;
      плюс идемпотентный `pnpm --filter api db:roles` для уже созданных баз
- [ ] `infra/compose/env/api.env.example` и `infra/README.md` — обе переменные

**Готово, когда:** `psql` под `gran_kush_app` видит таблицы, а `pnpm --filter api dev` стартует
на app-роли (политик ещё нет, поведение не меняется).

---

## Шаг 3 — TASK-203: SQL-слой политик `[ ]`

- [ ] функция контекста, создаётся owner-ролью, `EXECUTE` выдаётся app-роли:

```sql
CREATE OR REPLACE FUNCTION current_portal_id() RETURNS uuid
LANGUAGE sql STABLE PARALLEL SAFE AS
$$ SELECT nullif(current_setting('app.portal_id', true), '')::uuid $$;
```

- [ ] шаблон политики для портальной таблицы:

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS members_tenant_isolation ON members;
CREATE POLICY members_tenant_isolation ON members
  USING (portal_id = current_portal_id())
  WITH CHECK (portal_id = current_portal_id());
```

- [ ] отдельный шаблон для `measurement_units`:
      `USING (portal_id IS NULL OR portal_id = current_portal_id())`,
      `WITH CHECK (portal_id = current_portal_id())`
- [ ] **fail-closed by design:** контекст не выставлен → `current_portal_id()` равна `NULL` →
      сравнение даёт `false` → ноль строк на чтение, отказ на запись. Никаких «если не задано,
      значит можно всё»

**Готово, когда:** вручную в `psql` под app-ролью транзакция с `set_config('app.portal_id', '<A>', true)`
возвращает только участников портала A, а без `set_config` — ноль строк.

---

## Шаг 4 — TASK-204: генератор политик из DMMF `[ ]`

Prisma не хранит RLS в `schema.prisma`, значит любая новая таблица приезжает без политики.
Ручной список политик протухнет на третьей миграции — нужен генератор с fail-closed поведением.

- [ ] `prisma/rls/apply-rls.ts`: читает DMMF, делит модели на три группы —
      есть `portalId` → портальная; в allowlist `GLOBAL_TABLES` → глобальная;
      **всё остальное → `throw`** с текстом «модель X: добавьте portalId или внесите в GLOBAL_TABLES»
- [ ] для каждой портальной таблицы генерирует идемпотентный DDL из шага 3
- [ ] проверяет наличие индекса с `portal_id` первой колонкой, иначе предупреждение в stderr
- [ ] `package.json`: `"rls:apply": "ts-node prisma/rls/apply-rls.ts"`,
      `"prisma:migrate": "prisma migrate dev && pnpm rls:apply"`
- [ ] `prisma/rls/roles.sql`, генератор и allowlist лежат в одном каталоге с README на пять строк

**Готово, когда:** добавление новой модели без `portalId` роняет `pnpm rls:apply` с внятной ошибкой,
а с `portalId` — молча создаёт политику.

---

## Шаг 5 — TASK-205: прокидывание контекста в приложение `[ ]`

Три части: хранилище контекста, расширение Prisma, обёртка транзакций.

- [ ] `TenantContextService` на нативном `AsyncLocalStorage<{ portalId?: string; inTransaction: boolean }>`
      (без новых зависимостей; `nestjs-cls` — альтернатива, если понадобится интеграция с интерцепторами)
- [ ] `PortalContextMiddleware`: после резолва портала обернуть продолжение цепочки —
      `als.run({ portalId: portal.id, inTransaction: false }, () => next())`.
      Именно `run`, не присваивание в `req`: контекст нужен на всю глубину вызова, включая репозитории
- [ ] расширение клиента:

```ts
base.$extends({
    query: {
        $allModels: {
            async $allOperations({ args, query }) {
                const ctx = tenantContext.get();
                if (!ctx?.portalId || ctx.inTransaction) return query(args);
                const [, result] = await base.$transaction([
                    base.$executeRaw`SELECT set_config('app.portal_id', ${ctx.portalId}, true)`,
                    query(args),
                ]);
                return result;
            },
        },
    },
});
```

- [ ] `runInPortalTransaction(fn)` в `PrismaService`: открывает интерактивную транзакцию,
      первым запросом делает `set_config`, ставит `inTransaction: true` в ALS и отдаёт `tx` в колбэк.
      Без этого расширение попыталось бы открыть транзакцию **внутри** транзакции
- [ ] мигрировать 15 прикладных вызовов `$transaction` на `runInPortalTransaction`
- [ ] два вызова `$queryRaw` (`financial-transaction-prisma.repository.ts:194`,
      `presence-session-prisma.repository.ts:179`) — расширение их не перехватывает,
      завернуть в `runInPortalTransaction` явно
- [ ] ESLint `no-restricted-syntax`: `$queryRaw`, `$executeRaw`, `$transaction` запрещены
      вне `src/common/prisma/**`

Отдельно проверить: если внутри `runInPortalTransaction` кто-то по ошибке дёрнет внешний
клиент вместо `tx`, запрос уйдёт на другое соединение без `SET LOCAL` и вернёт ноль строк.
Это правильное поведение (fail-closed), но диагностируется плохо — стоит покрыть тестом.

**Важная деталь про DI.** `$extends` возвращает клиент другого типа. Варианты:

| Вариант | Плюс | Минус |
|---|---|---|
| **(рекомендуется)** переименовать класс в `BasePrismaService`, отдавать под токеном `PrismaService` фабрику с расширенным клиентом и типом `TenantPrismaClient` | честные типы, 43 файла правятся механически (импорт типа) | 43 файла в диффе |
| каст `as unknown as PrismaService` в фабрике | ноль правок в репозиториях | каст вне DTO-границы, `$transaction` расширенного клиента ведёт себя иначе, чем обещает тип |

**Готово, когда:** любой CRM-эндпоинт работает, а временно убранный `where: { portalId }`
в каком-нибудь репозитории всё равно возвращает только свой портал (проверяется тестом на шаге 8).

---

## Шаг 6 — TASK-206: системные пути `[ ]`

Полный список мест, которые обязаны работать **без** портального контекста, — их нужно перевести
на `PrismaSystemService` (owner-роль) или явно задать портал. Отправная точка для аудита —
список `portalContextOptional` в `PortalContextMiddleware`.

- [ ] `POST /platform/portals/register` → `PortalRegistrationService`: портал создаётся системным
      клиентом, а провижининг шаблонов должен идти **уже с контекстом нового портала** —
      внутри той же транзакции после `INSERT portals` вызвать
      `set_config('app.portal_id', portal.id, true)`. Так провижининг проверяется политиками,
      а не обходит их
- [ ] остальные `/platform/*` контроллеры → системный клиент
- [ ] кросс-портальные экраны: `/crm/my-portals`, `/lk/portals`, `/lk/account`, `/lk/spending`,
      `/lk/reviews` — читают `members`/`employees` по всем порталам пользователя.
      Системный клиент **с обязательным явным `where: { userId }`**; ревью каждого запроса отдельно
- [ ] `/users/*`, `/public/*` — классифицировать: если трогают только глобальные таблицы,
      менять нечего
- [ ] кроны (`BillingCronService`, `PresenceCronService`) — системный клиент;
      при переходе на «крон в воркер-деплое» ([§7](../backend/IDEMPOTENCY_AND_SCALING.md))
      ничего не меняется
- [ ] BullMQ-процессоры: `member-files` и `portal-events` знают `portalId` из payload —
      обернуть `process()` в `als.run({ portalId })`; `mail` работает с глобальными данными →
      системный клиент. Там, где `portalId` в payload нет, — добавить его в payload,
      а не расширять область системного клиента
- [ ] `prisma/seed-admin.ts` — owner-роль (получится автоматически после смены URL)
- [ ] `PortalResolutionService` читает `portals` (глобальная таблица) — менять нечего
- [ ] правило ревью: `PrismaSystemService` инжектится только в перечисленных модулях

**Готово, когда:** ни один запрос из списка не падает и ни один не возвращает данные чужого портала.

---

## Шаг 7 — TASK-207: составные внешние ключи (опционально, после основного) `[ ]`

Проверка внешнего ключа в Postgres выполняется в обход RLS. Значит `order_items.order_id` может
указывать на заказ чужого портала, даже когда `portal_id` самой строки свой. Под RLS такой join
ничего не вернёт, но данные будут битые.

- [ ] на родителях `@@unique([id, portalId])`
- [ ] на детях `@relation(fields: [orderId, portalId], references: [id, portalId])`
- [ ] проверить поведение Prisma на вложенных `create`: составные связи конфликтуют с ручной
      установкой скалярных полей связи. Если упрётся — оставить `@@unique` на родителях
      и вернуться к вопросу позже

Шаг вынесен отдельно и намеренно **после** рабочего RLS: он самый капризный и не блокирует эффект.

---

## Шаг 8 — TASK-208: тесты `[ ]`

- [ ] `test/rls.e2e-spec.ts` — уровень SQL, через app-роль:
      - [ ] контекст A → `SELECT` по каждой портальной таблице возвращает только строки A
      - [ ] контекст A → `INSERT` со строкой портала B падает (нарушение `WITH CHECK`)
      - [ ] контекст A → `UPDATE`/`DELETE` строки B обновляет ноль строк
      - [ ] без контекста → ноль строк на чтение, отказ на запись
      - [ ] системный клиент видит оба портала
      - [ ] `measurement_units`: общий справочник виден обоим, кастомная единица A не видна B
- [ ] **негативный контроль** — тестовый репозиторий с намеренно забытым `where portalId`:
      возвращает только свой портал. Это единственный тест, который доказывает, что фильтрует
      именно RLS, а не код
- [ ] **тест дрейфа схемы**: пройти по `pg_class` для всех таблиц `public` и проверить, что каждая
      либо в `GLOBAL_TABLES`, либо имеет `relrowsecurity` и хотя бы одну политику.
      Новая модель без политики роняет CI
- [ ] **тест индексов**: у каждой портальной таблицы есть индекс с `portal_id` первой колонкой
- [ ] `tenant-isolation.e2e-spec.ts` — прогнать без изменений: набор кейсов остаётся валидным,
      меняется только слой, который их обеспечивает
- [ ] CI: в шаге подготовки БД создать обе роли (см. `infra/README.md`)

---

## Шаг 9 — нагрузочная проверка и индексы

- [ ] замерить p95 двух-трёх списочных эндпоинтов (`GET /crm/members`, `GET /crm/orders`)
      до и после включения политик
- [ ] `EXPLAIN ANALYZE` на тех же запросах: убедиться, что предикат политики не превратил
      index scan в seq scan
- [ ] если оверхед транзакции-на-запрос заметен — сгруппировать серии запросов в один
      `runInPortalTransaction` в самых горячих сервисах; переписывать драйвер-адаптер под
      «соединение на запрос» — только по результатам замеров, не заранее

---

## Шаг 10 — TASK-209: ошибки, наблюдаемость, документация `[ ]`

- [ ] `GlobalExceptionFilter`: нарушение `WITH CHECK` (Postgres `42501`,
      `new row violates row-level security policy`) → `403`, а не `500`.
      Точный класс ошибки Prisma под driver adapter определить экспериментально и покрыть тестом
- [ ] предупреждение в лог, когда запрос к `/crm/*` или `/lk/*` (кроме `portalContextOptional`)
      доходит до БД без контекста портала — это симптом бага, а не нормальный режим
- [ ] `portalId` в структурных логах запроса — стыкуется с [TASK-116](./scaling-roadmap.md)
- [ ] обновить: [DEPLOYMENT.md](../DEPLOYMENT.md) (две переменные окружения, порядок деплоя),
      [backend/README.md](../backend/README.md),
      [MODULE_DEVELOPMENT_PRINCIPLES.md](../backend/MODULE_DEVELOPMENT_PRINCIPLES.md)
      (правило «код фильтрует, БД гарантирует» + список модулей, где допустим `PrismaSystemService`),
      [HTTP_API_CONTRACT.md](../backend/HTTP_API_CONTRACT.md) (403 при попытке записи в чужой портал),
      [IDEMPOTENCY_AND_SCALING.md §5.2](../backend/IDEMPOTENCY_AND_SCALING.md) (отметить вариант выбранным)

---

## Шаг 11 — TASK-210: деплой `[ ]`

- [ ] `infra/docker/api-entrypoint.sh`: после `prisma migrate deploy` добавить `pnpm rls:apply`,
      оба шага под `DATABASE_OWNER_URL`; приложение стартует под `DATABASE_URL` (app-роль)
- [ ] пересекается с [TASK-106](./scaling-roadmap.md) («миграции вне старта контейнера»):
      если миграции переезжают в отдельный шаг деплоя, `rls:apply` едет вместе с ними
- [ ] реплики чтения ([TASK-115](./scaling-roadmap.md)): политики реплицируются вместе со схемой,
      но GUC надо выставлять и на соединениях к реплике — учесть при внедрении расширения read-replicas
- [ ] откат одной переменной: `DATABASE_URL` → owner-роль. Задокументировать в `infra/README.md`

---

## Порядок выполнения

1. **Схема и инфраструктура:** шаг 1 (TASK-201) → шаг 2 (TASK-202). Здесь же бесплатно
   закрываются TASK-108 и TASK-109 — они всё равно требуют трогать те же таблицы.
2. **База включается:** шаг 3 (TASK-203) → шаг 4 (TASK-204). После этого политики есть,
   но приложение работает на owner-роли и ничего не замечает.
3. **Приложение переключается:** шаг 5 (TASK-205) → шаг 6 (TASK-206). Самая рискованная часть:
   до конца шага 6 половина системных путей будет падать — это ожидаемо и правильно
   (fail-closed), их и надо все найти.
4. **Доказательства:** шаг 8 (TASK-208) → шаг 9. Без негативного контроля и теста дрейфа
   работа не считается сделанной: политики, которые никто не проверяет, тихо отваливаются
   на первой же новой таблице.
5. **Обвязка:** шаг 10 (TASK-209) → шаг 11 (TASK-210).
6. **Потом, по желанию:** шаг 7 (TASK-207).

Шаги 1–2 и 3–4 можно вести параллельно с любой другой работой. Шаги 5–6 лучше делать одной
веткой и одним заходом: промежуточное состояние нерабочее.

---

## Definition of Done

- [ ] Каждая портальная таблица имеет `portal_id`, индекс по нему и политику изоляции
- [ ] Runtime подключается ролью без `BYPASSRLS` и без владения таблицами
- [ ] Контекст портала выставляется транзакционно (`SET LOCAL`), сессионный `SET` не используется нигде
- [ ] Отсутствие контекста означает ноль строк и отказ записи, а не «видно всё»
- [ ] Все системные пути перечислены, используют отдельный клиент и покрыты ревью
- [ ] Негативный контроль (запрос без `where portalId`) возвращает только свой портал
- [ ] Тест дрейфа роняет CI на новой таблице без политики
- [ ] `tenant-isolation.e2e-spec.ts` и `crm-rbac.e2e-spec.ts` зелёные
- [ ] p95 списочных эндпоинтов не деградировал заметно, планы запросов проверены
- [ ] Откат описан и состоит из одной переменной окружения
