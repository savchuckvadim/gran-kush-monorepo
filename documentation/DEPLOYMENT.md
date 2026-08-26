# Развёртывание и эксплуатация

Инструкция для DevOps: что где лежит, как поднять, как работает CI/CD, какие ключи нужны
и что учесть при масштабировании. Всё описанное живёт в [`infra/`](../infra) и
[`.github/workflows/`](../.github/workflows).

> Разворачиваете с нуля на новом сервере? Идите по пошаговому рунбуку
> **[VPS_SETUP.md](./VPS_SETUP.md)** (Hetzner + Cloudflare, от заказа VPS до автодеплоя).
> Этот документ — справочник, а не последовательность действий.

Смежные документы: [журнал работ](./HISTORY.md), [контракт HTTP API](./backend/HTTP_API_CONTRACT.md),
[план деплоя](./tasks/deployment.md), [README инфраструктуры](../infra/README.md).

---

## 1. Карта инфраструктуры

| Файл | Назначение |
|------|------------|
| [`infra/compose/docker-compose.dev.yml`](../infra/compose/docker-compose.dev.yml) | dev: только Postgres + Redis, приложения запускаются на хосте |
| [`infra/compose/docker-compose.prod.yml`](../infra/compose/docker-compose.prod.yml) | прод: полный стек — postgres, redis, api, crm, web, admin, nginx |
| [`infra/compose/docker-compose.deploy.yml`](../infra/compose/docker-compose.deploy.yml) | оверлей: брать готовые образы из ghcr.io вместо сборки на сервере |
| [`infra/compose/docker-compose.tls.yml`](../infra/compose/docker-compose.tls.yml) | оверлей: публикует `:443` и монтирует сертификат в nginx |
| [`infra/compose/.env.example`](../infra/compose/.env.example) | переменные самого compose (домены, пароль БД, публичные URL) |
| [`infra/compose/env/api.env.example`](../infra/compose/env/api.env.example) | рантайм-секреты контейнера API |
| [`infra/docker/api.Dockerfile`](../infra/docker/api.Dockerfile) | образ NestJS API |
| [`infra/docker/next.Dockerfile`](../infra/docker/next.Dockerfile) | общий образ для трёх Next-приложений (аргумент `APP`) |
| [`infra/docker/api-entrypoint.sh`](../infra/docker/api-entrypoint.sh) | миграции (+опционально сид) → старт API |
| [`infra/docker/nginx/templates/default.conf.template`](../infra/docker/nginx/templates/default.conf.template) | маршрутизация по `Host`, HTTP `:80` |
| [`infra/docker/nginx/tls/tls.conf.template`](../infra/docker/nginx/tls/tls.conf.template) | те же хосты на `:443`, подключается оверлеем |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | lint, typecheck, unit, e2e на каждый push |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | сборка образов → ghcr.io → SSH-деплой → smoke-проверка |

Наружу опубликован только nginx (`:80`). Всё остальное общается внутри docker-сети,
Postgres и Redis портов на хост не пробрасывают.

| Домен (переменная) | Сервис |
|--------------------|--------|
| `API_HOST` | `api:3000` |
| `CRM_HOST` | `crm:5000` |
| `WEB_HOST` | `web:5001` — личный кабинет участника |
| `ADMIN_HOST` | `admin:5002` |

Папка `docker/` в корне репозитория — легаси от прежней схемы, на неё не ссылается ни один
workflow и ни один compose-файл. Актуальна только `infra/`.

---

## 2. Быстрый старт

### Локально

Поднимаются только базы, приложения крутятся на хосте:

```bash
pnpm docker:dev        # Postgres + Redis
pnpm dev               # turbo: api, crm, web, admin
pnpm docker:dev:down
```

> Порты берутся из `apps/api/.env` (`POSTGRES_PORT`, `REDIS_PORT`), потому что скрипт передаёт
> `--env-file apps/api/.env`. Запуск голым `docker compose -f infra/compose/docker-compose.dev.yml up -d`
> этот файл игнорирует, поднимет Redis на дефолтном порту и разойдётся с `REDIS_URL` —
> API будет писать `ECONNREFUSED` при живом контейнере. Подробности в [журнале](./HISTORY.md).

### Прод с нуля

```bash
cp infra/compose/.env.example        infra/compose/.env
cp infra/compose/env/api.env.example infra/compose/env/api.env
# заполнить оба файла: пароль БД, JWT-секреты, домены, S3, SMTP

pnpm docker:prod        # сборка образов на месте + up -d
```

Сборка трёх Next-приложений тяжёлая. Если сервер слабый — не собирайте на нём, используйте
готовые образы из реестра (см. §4, оверлей `docker-compose.deploy.yml`).

Миграции прогоняются автоматически при старте API (`RUN_MIGRATIONS=true`). Платформенный
администратор сидируется отдельно — либо `RUN_SEED=true` на первый запуск, либо разово:

```bash
docker compose -f infra/compose/docker-compose.prod.yml exec api pnpm prisma:seed:admin
```

---

## 3. Переменные окружения

Файлов два, и они не взаимозаменяемы:

- **`infra/compose/.env`** — читается самим compose: пароль Postgres, домены для nginx,
  публичные URL для сборки фронтов, флаги `RUN_MIGRATIONS` / `RUN_SEED`.
  Передавать явно: `docker compose --env-file infra/compose/.env ...`.
- **`infra/compose/env/api.env`** — рантайм контейнера API: секреты JWT, куки, S3, SMTP, Telegram.

`DATABASE_URL`, `REDIS_URL`, `NODE_ENV` и `PORT` задаются в compose-файле и **перекрывают**
значения из `api.env` — правьте их только в compose.

Оба файла в `.gitignore`: на сервер они не приезжают через git, их нужно положить руками.

### Что нельзя потерять

| Переменная | Последствия потери |
|------------|--------------------|
| `ENCRYPTION_MASTER_KEY` | зашифрованные данные в БД не расшифровать, ключ невосстановим |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | смена разлогинит всех разом |
| `COOKIE_SECRET` | подписанные куки станут невалидными |
| `POSTGRES_PASSWORD` | доступ к тому с данными |

### NEXT_PUBLIC_* — это build-time

`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CRM_URL`, `NEXT_PUBLIC_MAIN_SITE_URL` вшиваются в браузерные
бандлы **на этапе сборки** образа, а не читаются в рантайме. Отсюда два следствия:

1. Значения должны быть публично доступными URL (`https://api.домен`), а не внутренними именами
   docker-сети (`http://api:3000`) — их будет резолвить браузер пользователя.
2. Поменяли домен — **пересоберите фронтовые образы**. Перезапуск контейнера ничего не изменит.

В CD они приходят из repository **variables** (не secrets), см. §4.

---

## 4. CI/CD

### CI — [`ci.yml`](../.github/workflows/ci.yml)

Триггер: любой push и ручной запуск. Две джобы:

- **checks** — `pnpm lint`, typecheck api/crm/web, unit-тесты API;
- **e2e** — поднимает сервисные контейнеры Postgres и Redis, прогоняет `prisma migrate deploy`
  и e2e-набор API. Секреты для тестов заданы прямо в workflow фиктивными значениями.

### CD — [`deploy.yml`](../.github/workflows/deploy.yml)

Триггер: push в `main` и ручной запуск. Три джобы:

1. **build** — матрица из четырёх образов (`api`, `crm`, `web`, `admin`), пушит в
   `ghcr.io/<owner>/<repo>/<app>` с двумя тегами: `sha-<commit>` и `latest`.
   Кэш слоёв — GitHub Actions cache, отдельный scope на приложение.
2. **server-check** — проверяет, заданы ли SSH-секреты, и отдаёт результат как output.
   Нужна потому, что `if:` на уровне джобы не умеет читать контекст `secrets`.
3. **deploy** — запускается только если проверка вернула `true`. По SSH обновляет `/opt/gran-kush`
   из `main`, экспортирует `TAG=sha-<commit>`, делает `pull` и `up -d --remove-orphans`,
   затем чистит старые образы. В конце — smoke-проверка курлом по `SMOKE_CHECK_URL`.

Пока сервера нет, деплой-джоба пропускается сама, а образы всё равно собираются и лежат в реестре.

### Что настроить в репозитории

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Секрет | Назначение |
|--------|------------|
| `SSH_HOST` | адрес сервера |
| `SSH_USER` | пользователь для деплоя |
| `SSH_PRIVATE_KEY` | **отдельный** deploy-ключ, не персональный |

**Variables** (там же, вкладка Variables):

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_API_URL` | вшивается в бандлы фронтов |
| `NEXT_PUBLIC_CRM_URL` | то же |
| `NEXT_PUBLIC_MAIN_SITE_URL` | то же |
| `SMOKE_CHECK_URL` | например `https://api.домен/health`; пустое значение — шаг пропускается |

### Требования к серверу

- Docker Compose **≥ 2.24** — оверлей использует `build: !reset null`; в старых версиях синтаксис
  не поддержан, и compose попытается собрать образы прямо на сервере.
- Репозиторий склонирован в `/opt/gran-kush`, ветка `main` тянется по fast-forward.
- Разовый `docker login ghcr.io` под PAT с правом `read:packages` — иначе `pull` приватных образов не пройдёт.
- Заполненные `infra/compose/.env` и `infra/compose/env/api.env` лежат на сервере.

### Откат

Образы тегируются коммитом, поэтому откат — это подстановка старого тега:

```bash
cd /opt/gran-kush
export TAG=sha-<предыдущий-коммит>
docker compose --env-file infra/compose/.env \
  -f infra/compose/docker-compose.prod.yml \
  -f infra/compose/docker-compose.deploy.yml up -d
```

Откат кода образами **не откатывает миграции БД** — их нужно откатывать отдельно и осознанно.

---

## 5. Домены, nginx, TLS

nginx разбирает запросы по заголовку `Host` и проксирует в нужный контейнер; шаблон подставляет
`*_HOST` через `envsubst` с фильтром, чтобы не затронуть собственные переменные nginx.

TLS вынесен в отдельный оверлей [`docker-compose.tls.yml`](../infra/compose/docker-compose.tls.yml):
он публикует `:443`, монтирует каталог `infra/docker/nginx/certs/` и добавляет второй шаблон
с `443`-блоками. Разделение нужно потому, что nginx не стартует, если `ssl_certificate`
указывает на отсутствующий файл — базовый compose должен подниматься на голой машине без сертификатов.

Рабочая схема прода — Cloudflare Origin CA на `домен` + `*.домен` (15 лет, без ACME) при режиме
**Full (strict)**; wildcard заранее закрывает поддомены клубов, то есть ветку «поддомены одного
домена» из TASK-112 [scaling-roadmap](./tasks/scaling-roadmap.md). Пошагово — в
[VPS_SETUP.md §4](./VPS_SETUP.md).

CD подключает оверлей автоматически, если на сервере лежит `infra/docker/nginx/certs/origin.pem`;
иначе деплоит по `:80`. Без этой проверки каждый деплой пересоздавал бы nginx без `443`.

---

## 6. Куки, CORS и домены — читать до выбора доменов

Аутентификация браузерных клиентов построена на HttpOnly-куках, а не на заголовке `Authorization`.
Параметры задаются в [`config-cookie.service.ts`](../apps/api/src/common/cookie/services/config-cookie.service.ts):
`httpOnly: true`, `sameSite: "lax"`, `path: "/"`, `domain` из env, `secure` из `AUTH_COOKIE_SECURE`.

Отсюда жёсткие требования к схеме доменов:

- **Все приложения и API должны быть на одном registrable-домене.** `api.example.ru`, `crm.example.ru`,
  `example.ru` — рабочая схема: кука с доменом `.example.ru` видна всем поддоменам, а `SameSite=Lax`
  считает такие запросы same-site. Если вынести API на отдельный домен, браузер перестанет отправлять
  куки, и понадобится `SameSite=None; Secure` — то есть правка кода, а не конфига.
- **`AUTH_COOKIE_SECURE=true` в проде**, иначе куки уедут по http.
- **`CRM_AUTH_COOKIE_DOMAIN` / `MEMBER_AUTH_COOKIE_DOMAIN`** пишутся с ведущей точкой (`.example.ru`).
- **`CORS_ORIGIN`** — список источников через запятую, точное совпадение со схемой и портом.
  Фронтенды ходят с `credentials: "include"`, поэтому wildcard недопустим.
- **Заголовки портала.** Запросы CRM несут `X-Portal-Slug`; маршруты, работающие без него, перечислены
  в [контракте HTTP API](./backend/HTTP_API_CONTRACT.md). Балансировщик и nginx не должны их вырезать.

---

## 7. Сторонние сервисы и ключи

| Сервис | Переменные | Обязателен | Комментарий |
|--------|-----------|-----------|-------------|
| PostgreSQL | `POSTGRES_*` → `DATABASE_URL` | да | в compose это контейнер с томом `postgres_data` |
| Redis | `REDIS_URL` | да | очереди BullMQ (`mail`, `member-files`, `portal-events`), том `redis_data` |
| AWS S3 | `AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY` | да, если нужны файлы | все загрузки идут только в S3; без настройки API отвечает `502 S3 storage is not configured` |
| SMTP | `MAIL_HOST`, `MAIL_PORT`, `MAIL_LOGIN`, `MAIL_PASSWORD` | да | письма подтверждения и приглашений, через очередь `mail` |
| Telegram | `TG_BOT_API_KEY`, `TG_BOT_CHAT_ID` | нет | служебные уведомления |
| ghcr.io | PAT с `read:packages` на сервере | да при деплое образами | пуш из Actions выполняет `GITHUB_TOKEN` |

Локального дискового хранилища у приложения нет — контейнеры остаются stateless,
тома нужны только базам.

---

## 8. Балансировка и реплики

| Компонент | Несколько реплик | Что учесть |
|-----------|------------------|------------|
| `web`, `crm`, `admin` | да | stateless, Next standalone. ISR-кэш у каждой реплики свой — при `revalidate` ответы реплик могут расходиться |
| `api` — HTTP | да | JWT в куках, сессии в БД, файлы в S3 → sticky sessions **не нужны** |
| `api` — воркеры BullMQ | да | очередь общая в Redis, задачи разбираются конкурентно, дублей не будет |
| `api` — задачи `@Cron` | **нет** | см. ниже |
| `api` — миграции при старте | **нет** | см. ниже |
| Postgres | нет (в текущем compose) | одна инстанция; для HA нужен managed-кластер или репликация вне compose |
| Redis | нет (в текущем compose) | одна инстанция; потеря Redis означает потерю невыполненных задач очередей |
| nginx | одна | при нескольких нодах балансировку и TLS выносить выше |

### Две вещи, которые сломаются при `--scale api=N`

**1. Задачи по расписанию продублируются.** Модуль [`cron`](../apps/api/src/modules/cron) построен на
`@nestjs/schedule`, а он держит расписание **в каждом процессе**: биллинг раз в час, присутствие
ежедневно в 3:00 и каждые 30 минут. С тремя репликами всё это отработает трижды. Лечится флагом
окружения (крон включён только на одном инстансе) либо распределённым локом в Redis перед задачей.

**2. Миграции запустятся параллельно.** [`api-entrypoint.sh`](../infra/docker/api-entrypoint.sh)
вызывает `prisma migrate deploy` на старте каждого контейнера. Prisma берёт advisory-lock, поэтому
данные не испортятся, но старт превратится в гонку, а логи — в кашу. Правильнее вынести миграцию
в отдельный шаг деплоя, а репликам поставить `RUN_MIGRATIONS=false`.

---

## 9. Чего в приложении пока нет

Список задач, которые всплывут при выходе под нагрузку; разбор и план —
[IDEMPOTENCY_AND_SCALING.md](./backend/IDEMPOTENCY_AND_SCALING.md) и
[scaling-roadmap.md](./tasks/scaling-roadmap.md):

1. ~~**Health-эндпоинта нет.**~~ Закрыто: `GET /health` (liveness, без БД) и `GET /ready`
   (Postgres + Redis, таймаут 2 с, при отказе — 503 с деталями). `SMOKE_CHECK_URL` направлять
   на `/health`.
2. ~~**Swagger открыт в проде**~~ Закрыто: при `NODE_ENV=production` Swagger не поднимается;
   `SWAGGER_ENABLED=true` включает его явно (например, на staging).
3. **Крон не защищён от многократного запуска** — см. §8.
4. **Миграции привязаны к старту контейнера** — см. §8.
5. **Метрик и трейсинга нет** — ни Prometheus-эндпоинта, ни OpenTelemetry.

---

## 10. Диагностика

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps
docker compose -f infra/compose/docker-compose.prod.yml logs -f api
docker compose -f infra/compose/docker-compose.prod.yml exec api sh
```

Типовые грабли:

- **API не видит Redis при живом контейнере** — разъехались порт контейнера и `REDIS_URL`;
  в dev причина почти всегда в запуске compose без `--env-file`.
- **Фронт стучится не туда после смены домена** — `NEXT_PUBLIC_*` вшиты в бандл, нужна пересборка образов.
- **Логин проходит, но следующий запрос без авторизации** — не долетают куки: проверьте
  `AUTH_COOKIE_SECURE`, домен куки с ведущей точкой и `CORS_ORIGIN`.
- **`400 Missing portal`** — не доехал заголовок `X-Portal-Slug`, см. [контракт HTTP API](./backend/HTTP_API_CONTRACT.md).
- **compose на сервере пытается собирать образы** — версия Compose ниже 2.24, `!reset` не поддержан.
