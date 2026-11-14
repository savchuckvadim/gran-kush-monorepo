# Безопасность на уровне БД: аудит и план

Дата: 2026-11-14. Ветка аудита: `fix/security-670`.

Зачем сейчас: платящих клубов ещё нет, поэтому схему, роли и деплой можно менять обычными
миграциями без оглядки на нагрузку. Позже то же самое будет дороже и рискованнее.

Принцип: **код фильтрует, БД гарантирует.** Явные `where: { portalId }` в коде остаются, а БД
отвечает за то, чтобы забытый фильтр, SQL-инъекция или взлом соседнего сервиса не открыли
чужие данные. Подробный рецепт RLS — [rls-postgres.md](./rls-postgres.md) (TASK-201…210). Его
инвентаризация таблиц устарела, актуальная — ниже.

---

## 1. Аудит: что есть сейчас

### 1.1 Одна роль на всё — суперпользователь

`POSTGRES_USER` из официального образа `postgres:16` — **суперпользователь**. Под ним работают:

- рантайм API (`DATABASE_URL` в `infra/dokploy/*/docker-compose.yml`);
- `prisma migrate deploy` при каждом старте контейнера (`infra/docker/api-entrypoint.sh`) и сид;
- **Payload-сайт**: его БД `site` лежит на том же сервере Postgres, и сайт ходит туда под тем же пользователем.

Следствия:
- Взлом Payload (`/admin` публичный, без 2FA — TASK-670) даёт полный доступ к CRM-базе:
  участники, документы, финансы.
- SQL-инъекция или RCE в API получает права суперпользователя. Через `COPY … TO PROGRAM`
  это ещё и shell в контейнере Postgres.
- Тяжёлый запрос ничем не ограничен: ни `statement_timeout`, ни лимита соединений.

### 1.2 Изоляции порталов в БД нет

RLS не включён, политик и ролей нет (`set_config`, `CREATE POLICY` в коде не встречаются).
Изоляция держится только на коде:

- `PrismaService` инжектят 94 файла, `$transaction` вызывается 62 раза, raw SQL — 16 мест.
  Все 16 параметризованы, `*Unsafe` не используется.
- Репозитории часто принимают голый `id`: `delete(id)`, `findById(id)` в `qr-code`, `product`,
  `product-category`, `portal-role`, `notification`, `operation`, `member`. Портал проверяется
  в сервисе перед вызовом (проверка, затем действие). Это работает, пока никто не забыл.
- Прикладные сервисы ходят в Prisma напрямую, мимо репозиториев: `entity-records.service`,
  `status-sets.service`, `portal-field-settings.service`, `order-stages.service`.
- Страховка — e2e: `tenant-isolation` (48 кейсов), `crm-rbac`, `entity-records-rbac`,
  `security`, `account-security`. Они ловят известные пути, но не новый репозиторий.

### 1.3 Схема: 70 моделей, `portalId` есть у 39

| Группа | Таблицы |
|---|---|
| Портальные с `portalId` (39) | `members`, `employees`, `portal_roles`, `orders`, `products`, `ledger_entries`, `counterparties`, `stock_moves`, `purchases`, `notifications`, `operations`, `portal_data_keys`, … |
| Портальные **без своего** `portalId` (9) | `status_items`, `field_definitions`, `field_options`, `form_definition_items`, `stages`, `qr_codes`, `presence_sessions`, `product_images`, `order_items` |
| Аккаунт (принадлежат человеку, не клубу) | `users`, `user_identities`, `account_profiles`, `user_documents`, `user_signatures`, `member_document_shares`, `auth_sessions`, `auth_tokens`, `notification_preferences` |
| Платформа | `portals`, `platform_admins`, `billing_plans`, `payment_events`, `idempotency_keys`, `domain_event_deliveries`, `global_*_templates` (7) |
| `portalId` nullable | `domain_events` (платформенные события), `document_access_logs`, `measurement_units` (общий справочник + свои единицы клуба) |

Внешние ключи не включают портал. Поэтому `orders.member_id`, `order_items.product_id`,
`ledger_entries.counterparty_id` и другие могут указывать на строку чужого клуба, если сервис
не проверит. Postgres проверяет FK в обход RLS, так что одной политикой эту дыру не закрыть.

### 1.4 Персональные данные и секреты

- ✓ Envelope-шифрование есть: `portal_data_keys` + `ENCRYPTION_MASTER_KEY`. Им закрыты финансы
  (`ledger-codec`, `organization_profiles`) и номер документа (`DocumentNumberCipher`).
- ✓ Токены писем, приглашений, согласий и сессий лежат хешами (`issueSecretToken`). Пароли — bcrypt.
- ✗ Открытым текстом: `account_profiles.birthday` / `phone` / `address`, анкеты в EAV
  (`field_values`), email.
- ? `account_profiles.consent_token` (varchar 128, unique) похож на остаток до перехода на хеши.
  Проверить, используется ли он, и удалить.
- ? Сканы документов лежат в приватном S3 (`user_documents.storage_path`). Включено ли
  шифрование на стороне хранилища, не проверено.

### 1.5 Эксплуатация

- ✓ Postgres не публикуется наружу, он только в сети проекта. TLS между API и БД нет, но они на одном хосте.
- ✗ Бэкапов нет (TASK-551): ни дампов, ни проверки восстановления. Для персональных данных
  это ещё и требование RGPD (ст. 32: доступность и восстановление).
- ✗ Redis без пароля (TASK-669).
- ✗ RGPD: нет удаления или анонимизации аккаунта и нет срока хранения сканов после выхода
  из клуба. Есть только чистка отозванных сессий через 30 дней (`auth-cron.service`).
- ? Платформенная админка читает данные клубов. Журналируются ли эти чтения, не проверено.

---

## 2. План

Порядок — от наибольшего эффекта при наименьшей цене. Фазы A и B не зависят от RLS и
закрывают самые опасные пути уже сами по себе.

### Фаза A — роли и лимиты `[ ]` P0, ~1 день, ветка `feat/db-roles`

**TASK-820: роли Postgres.** Вместо одного суперпользователя — четыре роли на инсталляцию:

| Роль | Кто | Права |
|---|---|---|
| `postgres` (суперпользователь) | только руками при обслуживании | — |
| `<бренд>_owner` | `migrate deploy`, сид, системный клиент RLS (фаза C) | владелец схемы и таблиц CRM-базы, `NOSUPERUSER` |
| `<бренд>_app` | рантайм API и воркеры | только DML (`SELECT/INSERT/UPDATE/DELETE`) и последовательности, без DDL и `BYPASSRLS` |
| `<бренд>_site` | Payload | владелец только базы `site`, `CONNECT` к CRM-базе отозван |

- [ ] `infra/postgres/roles.sql`: идемпотентный скрипт (создать роли, если их нет). В нём
      `REVOKE CREATE ON SCHEMA public FROM PUBLIC`,
      `ALTER DEFAULT PRIVILEGES FOR ROLE <owner> … GRANT … TO <app>` и
      `REVOKE CONNECT ON DATABASE <crm> FROM PUBLIC`.
- [ ] Dev: скрипт в `/docker-entrypoint-initdb.d/` и `pnpm --filter api db:roles` для уже
      созданных баз. Пароли ролей — из env, не из скрипта.
- [ ] Прод: одноразовый запуск скрипта на каждой инсталляции. Владение схемой `public`,
      таблицами (включая `_prisma_migrations`), последовательностями и типами передать
      `<owner>` циклом `ALTER … OWNER TO` в `DO`-блоке. `REASSIGN OWNED` не подходит:
      текущий пользователь — bootstrap-суперпользователь, ему принадлежат системные объекты.
      Данные не трогаются.
- [ ] `DATABASE_URL` → `_app`, новый `DATABASE_OWNER_URL` → `_owner`. Его используют
      `prisma.config.ts`, entrypoint (миграции) и `seed-admin`. У сайта своя пара логин/пароль.
- [ ] `env.template`, `infra/dokploy/README.md`, CLAUDE.md (таблица env) и CI (e2e создаёт роли).

**TASK-821: лимиты рантайм-роли.** `ALTER ROLE <app> SET`:
`statement_timeout = '15s'`, `idle_in_transaction_session_timeout = '30s'`, `lock_timeout = '5s'`.
Плюс `CONNECTION LIMIT`, согласованный с пулом `PrismaPg`. Значения — в скрипте ролей,
фоновые операции (TASK-809) получают свой таймаут через `SET LOCAL`.

**Готово, когда:** API, воркеры и сайт работают на своих ролях; `CREATE TABLE`, `DROP` и
`COPY … PROGRAM` под `_app` дают отказ; `_site` не подключается к CRM-базе; e2e зелёные.
Откат — вернуть старый `DATABASE_URL`.

### Фаза B — бэкапы `[ ]` P0, Вадим + ½ дня кода

**TASK-551 (расширение): бэкапы с проверкой восстановления.**
- [ ] Ежедневный `pg_dump -Fc` CRM-базы и `site` в отдельное хранилище (Dokploy Backups → S3),
      хранить 14 дней. Дамп шифруется ключом, которого нет на сервере.
- [ ] Раз в месяц — восстановление в пустой контейнер и `prisma migrate status` (скрипт в `infra/`).
- [ ] `ENCRYPTION_MASTER_KEY` хранится отдельно от дампов. Без него зашифрованные поля из
      дампа не прочитать, и это хорошо, но потерять его — значит потерять финансы.

### Фаза C — схема под изоляцию `[ ]` P1, 1–2 дня, ветка `feat/db-tenant-schema`

**TASK-822 (= TASK-201 + TASK-207): `portal_id` в дочерних таблицах и составные FK.**
- [ ] `portalId` в 9 дочерних таблицах из §1.3. Миграция заполняет его из родителя
      (`UPDATE … FROM parent`), потом `SET NOT NULL`. Сброс прода не нужен.
- [ ] Индексы с `portal_id` первой колонкой; уникальные ключи дочерних таблиц расширить порталом.
- [ ] `@@unique([id, portalId])` на портальных родителях и составные FK
      `(x_id, portal_id) → parent(id, portal_id)` на всех связях «портальное → портальное».
      После этого строка физически не может ссылаться на чужой клуб, даже без RLS.
- [ ] Nullable `portalId`: `domain_events` и `measurement_units` — по правилам из
      [rls-postgres.md §3.2](./rls-postgres.md); `document_access_logs` — сделать NOT NULL,
      если доступ всегда идёт через клуб.

**Готово, когда:** миграция проходит на копии продовой базы, e2e зелёные, вставка
`order_items` с товаром чужого портала падает на FK.

### Фаза D — RLS `[ ]` P1, 3–5 дней, ветка `feat/rls`

Шаги 3–6 и 8–11 из [rls-postgres.md](./rls-postgres.md) с поправками на текущий код:
- [ ] Генератор политик из DMMF с allowlist глобальных таблиц: новая модель без политики
      роняет CI (TASK-203/204).
- [ ] `AsyncLocalStorage` + `$extends` с `SET LOCAL app.portal_id`; системный клиент под
      `_owner` — только в перечисленных модулях (TASK-205/206). Сейчас это 62 `$transaction`
      (в старом плане было 15) и 16 raw SQL.
- [ ] Процессоры (`domain-events`, `operations`, `member-files`) и кроны выставляют портал
      из payload. Платформенная админка ходит через системный клиент.
- [ ] Заодно: репозитории принимают `portalId` вместе с `id`, а сервисы из §1.2 переходят
      на репозитории (правило из CLAUDE.md).
- [ ] Тесты: негативный контроль (репозиторий без `where portalId` видит только свой
      портал), тест дрейфа схемы, замер p95 (TASK-208/209).

**TASK-823 (по желанию, после D): RLS на аккаунт-таблицах** через `app.user_id`.
`account_profiles`, `user_documents` и `user_signatures` видит только сам владелец; клуб
видит их через `member_document_shares`. Решать после замеров фазы D.

### Фаза E — персональные данные и RGPD `[ ]` P1, 2–3 дня

**TASK-824: шифрование ПДн в профиле.** `phone`, `address` и `birthday` из `account_profiles`
шифровать тем же `EncryptionService`, что и номер документа. Для поиска по телефону —
blind index (как `counterparties.nif_index`). Удалить `consent_token`, если он не используется.

**TASK-825: чувствительные поля анкеты.** Флаг `sensitive` у `field_definitions`: значение
шифруется ключом портала (`PortalCipherService`), из поиска и экспорта поле исключается.

**TASK-826: RGPD — удаление и сроки.**
- [ ] Удаление аккаунта: анонимизировать `users` и `account_profiles`, удалить сканы, подпись,
      сессии и идентичности. Финансовые проводки клуба остаются, но без ссылок на человека.
- [ ] Срок хранения сканов после выхода из всех клубов (решение Вадима и юриста) и крон чистки.
- [ ] Журнал чтений платформенной админки по данным клубов (если его нет —
      `document_access_logs` или отдельная таблица).

---

## 3. Решения, нужные от Вадима

1. Фаза A на проде: даунтайм около минуты на передачу владения и смену `DATABASE_URL` на
   трёх инсталляциях. Сделать в одно окно?
2. RLS (фаза D) — делать сейчас, пока нет клиентов, или после фаз A, C и E? Рекомендую A → B →
   C → E → D. Роли и составные FK закрывают большую часть риска за 2–3 дня, а RLS — самая
   дорогая часть и добавляет транзакцию на каждый запрос.
3. Сроки хранения сканов и порядок удаления аккаунта (TASK-826) — нужен юрист.
