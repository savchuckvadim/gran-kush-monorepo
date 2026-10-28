# Продуктовые сайты PafPaf, Ink Space и Plis Plas (`apps/site`)

Сайты, которые продают CRM. Один код, своя сборка, своя база и своя админка на каждую инсталляцию
(`packages/brand`, TASK-793). Nagual — только тема CRM, сайта у него нет (TASK-761).

| | PafPaf | Ink Space | Plis Plas |
|---|---|---|---|
| Сборка | `NEXT_PUBLIC_SITE=pafpaf` | `NEXT_PUBLIC_SITE=inkspace` | `NEXT_PUBLIC_SITE=plisplas` |
| Домен | `paf-paf.app` | `ink-space.app` | не куплен |
| Дизайн | «жидкий»: живой WebGL-дым, жидкое стекло, жидкие компоненты | тема PafPaf с палитрой чернил (эффект чернил — TASK-762) | тема PafPaf с розовой палитрой |
| Стартовый контент | `payload/seed/content.ts` | `payload/seed/content-inkspace.ts` | нет |

Имя, знак, домены и надпись логотипа — из бренда; меню главной — `modules/shared/config/home-sections.ts`;
юридические тексты написаны для PafPaf, другие инсталляции получают своё имя и домен (`legal/content/index.ts`).

## Стек и решения

- **Стек.** Next 16 + Payload 3 в одном приложении:
  - сайт — `/{locale}/…`;
  - админка — `/admin`, своя у каждой инсталляции;
  - REST API Payload — `/api`.
- **Языки** — `es` (по умолчанию), `ru`, `en`:
  - тексты интерфейса — next-intl, `modules/shared/config/i18n/messages`;
  - контент — локализованные поля Payload.
- **База** — своя база `site` на том же Postgres, что и API. Prisma её не видит, `migrate reset` её не сотрёт, бэкапы раздельные.
- **Цены** берутся из API: `GET /platform/billing/plans`, `BillingPlan`. По этим цифрам CRM выставляет счёт.
  - Payload хранит только тексты тарифа и запасные цены на случай, если API недоступен.
  - Коды тарифов: `barrio-month`, `barrio-year`, `club-month`, `club-year`, `cadena-month`, `cadena-year`.
  - Годовая строка хранит сумму за год, сайт показывает цену в месяц.
- **Деньги — только в API.** Payload не списывает и не хранит платежи.
- **Дизайн сайта лежит в `modules/sites/<site>/`:**
  - `theme.ts` — стили и шрифты;
  - `frame.tsx` — шапка, футер, фоновые эффекты;
  - `blocks/` — React-компоненты блоков.

  Сборка выбирает сайт через алиас `@site/theme`, см. `next.config.ts`.

## Запуск локально

```bash
# 1. Postgres для разработки (тот же, что у API)
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres

# 2. Окружение сайта
cp apps/site/.env.example apps/site/.env      # задать PAYLOAD_SECRET

# 3. База site, схема, контент PafPaf на трёх языках
pnpm --filter site db:ensure
pnpm --filter site seed

# 4. Сайт
pnpm --filter site dev                         # http://localhost:5002/es
```

- **Админка** — http://localhost:5002/admin. При первом входе Payload попросит создать пользователя.
- **Схема базы.** В dev синхронизируется сама (`PAYLOAD_DB_PUSH=true`). В продакшене при старте сайта применяются миграции из `apps/site/migrations`.
- **Настоящие цены:**
  - нужен запущенный API (`pnpm --filter api dev`), эндпоинт `GET /platform/billing/plans`;
  - в `billing_plans` должны быть строки с кодами выше, см. «Тарифы в API».

  Без этого сайт показывает запасные цены из CMS.
- **После изменения коллекций или блоков:**
  - `pnpm --filter site generate` — типы `payload-types.ts` и карта импорта админки;
  - `pnpm --filter site migrate:create <имя>` — миграция для продакшена, коммитится вместе с изменением.

## Блоки PafPaf

| Блок | Что делает |
|---|---|
| `hero` | живой дым, линза, всплеск дыма по клику, счётчики «сейчас в клубе» |
| `qrDoor` | телефон: QR → проверка → вход отмечен |
| `featureGrid` | стеклянные карточки, под наведённую подтекает «капля» |
| `limitFlask` | колба месячного лимита с ползунком выдачи |
| `clubsMerge` | клубы-капли сливаются в один аккаунт при прокрутке |
| `privacyRoles` | карточка участника за матовым стеклом, которое «тает» по роли |
| `pricingTeaser`, `pricingTable` | тарифы, переключатель месяц/год, калькулятор по числу участников |
| `addons`, `faq`, `finalCta` | допы, вопросы-«капли», финальный призыв |

**Как добавить блок:**
1. Описать конфиг в `payload/blocks.ts` и добавить его в `PAGE_BLOCKS`.
2. Сделать компонент в `modules/sites/pafpaf/blocks/` и подключить его в `render-blocks.tsx`.
3. Запустить `pnpm --filter site generate`.

## Продакшен

Деплой идёт через Dokploy на общем сервере. Схема и порядок первого запуска описаны в `infra/dokploy/README.md`.

- **Образ.** `site` собирает `deploy.yml` вместе с остальными образами, общим `infra/docker/next.Dockerfile`.
- **Первый старт на пустой базе.** Сайт всё делает сам (`payload/seed/bootstrap.ts`):
  - создаёт базу `site` и применяет миграции;
  - заводит админа CMS из `PAYLOAD_ADMIN_EMAIL` и `PAYLOAD_ADMIN_PASSWORD`, так что открытая форма «создать первого пользователя» на публичном домене не появляется;
  - заливает стартовый контент при `PAYLOAD_SEED_IF_EMPTY=true`.
- **Загрузки Payload** лежат в `apps/site/media`. В dev папка в git-ignore, в проде это том.
- **Адрес сайта** для canonical, OpenGraph, `robots.txt`, `sitemap.xml` и JSON-LD задаёт `NEXT_PUBLIC_SERVER_URL`. Без него берётся прод-домен сайта из `modules/shared/config/site.ts`.

## Тарифы в API

Сейчас в `billing_plans` есть только `trial`, поэтому сайт показывает запасные цены.

Тарифы попадут в прод data-миграцией Prisma, а не через `seed-admin.main.ts`: контейнеры по умолчанию запускают `migrate deploy`, а сид — только по opt-in (`RUN_SEED=true` или `BOOTSTRAP_ADMIN_ENABLED=true`).

Набросок (Postgres 16, `gen_random_uuid()` есть):

```sql
INSERT INTO "billing_plans" ("id","code","name","price_amount","currency","interval","features_json","updated_at") VALUES
  (gen_random_uuid()::text,'barrio-month','Barrio',25.00,'EUR','month','{...}',CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'barrio-year','Barrio',240.00,'EUR','year','{...}',CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'club-month','Club',49.00,'EUR','month','{...}',CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'club-year','Club',468.00,'EUR','year','{...}',CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'cadena-month','Cadena',99.00,'EUR','month','{...}',CURRENT_TIMESTAMP),
  (gen_random_uuid()::text,'cadena-year','Cadena',948.00,'EUR','year','{...}',CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
```

- У `id` и `updated_at` в базе нет дефолта, их нужно указывать явно.
- Флаги `features_json` для каждого тарифа решает продукт.
- Сайт запрашивает цены на сервере и кэширует их на 5 минут (`revalidate: 300`), потому что у API общий лимит 300 запросов в минуту на IP. Если цены понадобятся в браузере, origin сайта нужно добавить в `CORS_ORIGIN`.

## Дальше

- Nagual — отдельный проект. Вариант `nagual` здесь пока заглушка и в деплой не входит.
- Блоки из других вариантов PafPaf: параллакс со звёздами, карточки с перетекающими рамками, карточки с дымом, «космический» hero.
- Продакшен:
  - бэкапы базы и медиа;
  - автодеплой после сборки образов (сейчас деплой запускается кнопкой в Dokploy);
  - `turbo prune` в образах. Сейчас каждый образ ставит зависимости всего монорепо (`COPY . .` и `pnpm install`), так что Payload и sharp попадают и в образы CRM, а образ API копирует `/app` целиком.
- Data-миграция с тарифами в API, см. «Тарифы в API».
