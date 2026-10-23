# PafPaf, Ink Space и Plis Plas на Dokploy

Отдельный проект на том же сервере и в той же панели Dokploy, где работают диваны. Чужие проекты на сервере не трогаем. Остальной `infra/` здесь не используется: его nginx занимает порт 80, а на сервере этот порт уже у Traefik. SSH-деплой из `deploy.yml` к этой схеме не относится: без SSH-секретов он не запускается.

## Как устроено

- Один код — по инсталляции на бренд (TASK-793): PafPaf (клубы, `paf-paf.app`), Ink Space (тату, `ink.space`), Plis Plas (бьюти, домен ещё не куплен). Каждая — свой проект Dokploy со своими Postgres, Redis, секретами, OAuth и ботами. Список, домены и порядок деплоя — `packages/brand/src/installations.json`.
- У каждой инсталляции один Compose-сервис из `infra/dokploy/<бренд>/docker-compose.yml`. В нём Postgres, Redis, API, CRM, кабинет, админка платформы и сайт. Файлы `docker-compose.yml` и `.env.example` бренда **генерируются** из `templates/` командой `node infra/dokploy/render.mjs`: правится шаблон, затем рендер, CI проверяет, что файлы свежие (`--check`). Имена сервисов (`<бренд>-api`, …) — ключи YAML, их нельзя взять из env, а на общей `dokploy-network` они должны быть уникальны.
- Бренд в API — переменная `BRAND` в compose (уже прописана). Образ API один на все инсталляции; CRM, админка и сайт собираются на бренд (адреса вшиваются при сборке) и различаются тегом: `crm:pafpaf-latest`, `crm:inkspace-latest`, откат — `crm:<бренд>-sha-<коммит>`.
- Сервисы на весь сервер (уборка диска `pafpaf-janitor`) — только в compose PafPaf (`serverServices` в `installations.json`).
- Портов наружу нет. Трафик по доменам раздаёт Traefik, а Postgres и Redis доступны только внутри проекта.
- Образы собирает GitHub Actions (`.github/workflows/deploy.yml`) при каждом push в `main` и кладёт в ghcr.io. Сервер ничего не собирает.
- Секреты хранятся только в Dokploy, на вкладке Environment. В git лежит только `.env.example`.
- У каждого сервиса есть лимит памяти, потому что сервер общий с продакшеном диванов. В сумме лимиты около 3,7 ГБ, обычно занято меньше.

| Домен | Сервис | Что это |
|---|---|---|
| `paf-paf.app` | `pafpaf-site` | сайт и админка контента на `/admin` |
| `crm.paf-paf.app` | `pafpaf-crm` | CRM клуба |
| `club.paf-paf.app` | `pafpaf-crm` | кабинет участника: второй домен того же сервиса, что и CRM (TASK-711). Proxy CRM по хосту `club.*` переписывает адреса в дерево кабинета, на `crm.` оно закрыто (404) |
| `api.paf-paf.app` | `pafpaf-api` | API |
| `admin.paf-paf.app` | `pafpaf-admin` | админка платформы |

Порт контейнера у всех сервисов 3000.

## Подготовка (один раз)

### Cloudflare, зона `paf-paf.app`

- A-записи на IP сервера с включённым прокси (оранжевое облако): `@`, `www`, `crm`, `club`, `api`, `admin`.
- Двухуровневые записи вроде `www.api` не нужны: бесплатный сертификат Cloudflare покрывает только `*.paf-paf.app`.
- Отдельный домен под панель Dokploy не нужен: панель одна на сервер и уже работает на `panel.divan.group`.
- SSL/TLS → режим **Full**, выбранный вручную. Не Automatic и не Flexible: с Flexible будет бесконечный редирект.
- **Always Use HTTPS** выключено, иначе может сломаться продление сертификатов Let's Encrypt. Для `.app` эта опция и не нужна: браузеры открывают такие домены только по HTTPS.
- Rules → Redirect Rules → шаблон «Redirect from WWW to root», чтобы `www.paf-paf.app` вёл на `paf-paf.app`.

### GitHub

- Адреса, которые вшиваются в CRM, админку и сайт, CI берёт из `installations.json` (`infra/dokploy/ci-matrix.mjs`); переменные `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CRM_URL` и `NEXT_PUBLIC_MEMBER_URL` в настройках репозитория больше не читаются. Осталась одна: `NEXT_PUBLIC_PLANS_PURCHASABLE`.
- Токен для образов не нужен, пока репозиторий публичный: образы в ghcr тоже публичные.

### Dokploy

1. Projects → Create Project → `pafpaf`.
2. Create Service → **Compose**, тип Docker Compose:
   - провайдер Git, URL `https://github.com/savchuckvadim/gran-kush-monorepo.git`, ветка `main`. Репозиторий публичный, поэтому ключ не нужен;
   - Compose Path: `./infra/dokploy/<бренд>/docker-compose.yml` (у PafPaf — `./infra/dokploy/pafpaf/docker-compose.yml`; до 23.10.2026 было `./infra/dokploy/docker-compose.yml` — в проекте `pafpaf` путь поменять перед первым деплоем после TASK-793);
   - **Autodeploy выключить**. Иначе Dokploy начнёт деплой сразу после push, пока GitHub ещё собирает новые образы.
3. Environment: вставить `infra/dokploy/<бренд>/.env.example` и заполнить. Секреты у каждой инсталляции свои.
   - Секреты генерируются командой `openssl rand -hex 32`.
   - Обязательные переменные помечены `(required)`. Пока хоть одна пустая, деплой останавливается с понятной ошибкой.
4. Domains: заполнить по таблице выше (домен, сервис, порт 3000, HTTPS, сертификат Let's Encrypt).
5. Deploy.

## Первый деплой

- **API** сам применит миграции Prisma (`RUN_MIGRATIONS=true`). Чтобы создать админа платформы, на первый деплой поставьте `RUN_SEED=true` и заполните `PLATFORM_BOOTSTRAP_ADMIN_*`. Потом верните `RUN_SEED=false`.
- **Сайт** при первом старте всё сделает сам:
  - создаст базу `site` и применит миграции Payload;
  - создаст админа CMS из `PAYLOAD_ADMIN_*`, так что форма «создать первого пользователя» на публичном домене ни разу не будет открыта;
  - зальёт стартовый контент (`PAYLOAD_SEED_IF_EMPTY=true`).

  Повторные старты ничего не перезаписывают: админ и контент создаются только в пустой базе. После первого входа `PAYLOAD_ADMIN_PASSWORD` можно убрать из Environment.
- **Проверить:**
  - `https://api.paf-paf.app/health`;
  - `https://paf-paf.app/es`. Пока в `billing_plans` нет тарифов, сайт показывает запасные цены из CMS;
  - `https://paf-paf.app/admin`, вход в CMS;
  - `https://crm.paf-paf.app`, `https://club.paf-paf.app`, `https://admin.paf-paf.app`.

## Обновления и откат

- **Обновление.** Push в `main` → GitHub Actions «Deploy» собирает образы (около 10 минут) → задача «Deploy on Dokploy» сама запускает деплой, если заданы секреты ниже. Без них — нажать Deploy в Dokploy. Каждый деплой скачивает свежие образы.
- **Откат.** В Environment указать `TAG=sha-<полный хеш коммита>` и нажать Deploy. Когда исправление выкачено, вернуть `TAG=latest`.
- **Изменились коллекции или блоки Payload.** Нужна миграция: локально выполнить `pnpm --filter site migrate:create <имя>` и закоммитить. В проде она применится при старте сайта.

### Автодеплой из GitHub Actions

Переключатель Autodeploy в Dokploy не подходит. С провайдером Git он срабатывает только от webhook в настройках репозитория, а если сработает — начнёт деплой сразу после push, пока образы ещё собираются, и выкатит старые. Поэтому он выключен, а деплой запускает сам workflow после сборки. До 14.10.2026 он на деле был включён (GitHub App шлёт push в Dokploy): каждый push сразу выкатывал старые образы, а свежие — только ручной Deploy. Выключен 14.10.2026.

1. Dokploy → Settings → Profile → API Keys: создать ключ.
2. ID compose-сервиса — последняя часть адреса страницы сервиса в Dokploy: `…/services/compose/<composeId>`.
3. GitHub → Settings → Secrets and variables → Actions → New repository secret:
   - `DOKPLOY_URL` — адрес панели: `https://panel.divan.group`;
   - `DOKPLOY_API_KEY` — ключ из шага 1;
   - `DOKPLOY_COMPOSE_ID_<БРЕНД>` — из шага 2, по одному на инсталляцию: `DOKPLOY_COMPOSE_ID_PAFPAF`, `DOKPLOY_COMPOSE_ID_INKSPACE`, `DOKPLOY_COMPOSE_ID_PLISPLAS`. Старый `DOKPLOY_COMPOSE_ID` PafPaf тоже принимается.
4. Деплой идёт по очереди `deployOrder`: Ink Space → Plis Plas → PafPaf. Следующая инсталляция начинается, только когда `https://api.<домен>/health` предыдущей ответил своим брендом и этим коммитом (`version`); красная останавливает остальные (`infra/dokploy/deploy.mjs`). Инсталляция без своего compose id пропускается.
5. Проверка: после следующего push в `main` в Actions → Deploy зелёная задача «Deploy on Dokploy», а в Dokploy → Deployments появился новый деплой.

## Почта

Письма (подтверждение email, сброс пароля, приглашения) уходят по SMTP. Провайдер должен быть в ЕС: передавать адреса участников клубов за пределы ЕЭЗ нельзя, а для России, например Beget, нет решения об адекватности.

- **Amazon SES, регион `eu-north-1`.** AWS у нас уже субобработчик, файлы лежат в том же регионе. Хост `email-smtp.eu-north-1.amazonaws.com`. SMTP-логин и пароль создаются в консоли SES, ключи IAM для этого не подходят. Домен `paf-paf.app` подтвердить записями DKIM в Cloudflare и запросить production access: в sandbox SES шлёт только на подтверждённые адреса.
- **Brevo** (Франция) — запасной вариант: `smtp-relay.brevo.com`.

### Amazon SES по шагам

1. AWS → SES, регион **Europe (Stockholm) `eu-north-1`** → Identities → Create identity → Domain `paf-paf.app`, Easy DKIM (RSA 2048). Включить **Custom MAIL FROM domain** `mail.paf-paf.app`.
2. Cloudflare → DNS зоны `paf-paf.app`. Все записи — **DNS only** (серое облако): через прокси Cloudflare почтовые записи не работают.
   - три CNAME от SES: `<токен>._domainkey` → `<токен>.dkim.amazonses.com`;
   - для `mail`: MX `feedback-smtp.eu-north-1.amazonses.com` с приоритетом 10 и TXT `v=spf1 include:amazonses.com ~all`;
   - TXT `_dmarc`: `v=DMARC1; p=none; rua=mailto:<свой адрес>`. Через пару недель без проблем — `p=quarantine`.
3. SES → SMTP settings → Create SMTP credentials. Это отдельный логин и пароль, ключи IAM не подходят.
4. SES → Account dashboard → **Request production access**: транзакционные письма (подтверждение почты, сброс пароля, приглашения), объём на старте маленький. Пока доступа нет, SES шлёт только на подтверждённые в SES адреса.
5. Dokploy → Environment и Deploy:
   - `MAIL_HOST=email-smtp.eu-north-1.amazonaws.com`;
   - `MAIL_PORT=587`: Hetzner закрывает 25 и 465, на 587 соединение шифруется через STARTTLS;
   - `MAIL_LOGIN`, `MAIL_PASSWORD` — из шага 3;
   - `SMTP_FROM=no-reply@paf-paf.app` — **только адрес**: API сам собирает отправителя как `"<SMTP_FROM_NAME>" <SMTP_FROM>`, имя по умолчанию PafPaf.

Если `MAIL_HOST` пустой, API пытается слать через localhost: письма не уходят, а в логах `pafpaf-api` появляется `Error sending email`. Проверить после настройки три письма: регистрация клуба, сброс пароля в CRM, приглашение сотрудника. В логах должно быть `Email successfully sent`.

## Вход через Google

Кнопка «Войти через Google» есть в CRM и в кабинете. Пока `GOOGLE_CLIENT_ID` пустой, она возвращает на форму входа с сообщением «не настроен» — ничего не ломается.

1. [console.cloud.google.com](https://console.cloud.google.com) → создать проект `pafpaf`.
2. APIs & Services → OAuth consent screen: тип **External**, название PafPaf, домен `paf-paf.app`, scopes — только `email`, `profile`, `openid` (non-sensitive). Опубликовать (Publish app): без публикации входить смогут только тестовые пользователи.
3. APIs & Services → Credentials → Create Credentials → **OAuth client ID**, тип Web application:
   - Authorized redirect URIs — ровно два:
     - `https://api.paf-paf.app/crm/auth/google/callback`
     - `https://api.paf-paf.app/cabinet/auth/google/callback`
   - Authorized JavaScript origins можно не заполнять (флоу редиректный).
   - С 16.10.2026 вход участника возвращается на `/cabinet/auth/google/callback` (раньше `/lk/…`): в уже
     созданном клиенте заменить старый URI на новый.
4. Dokploy → Environment: `GOOGLE_CLIENT_ID` и `GOOGLE_CLIENT_SECRET` из созданного клиента → Deploy.

Для локальной разработки — отдельный OAuth client с redirect URI `http://localhost:3000/crm/auth/google/callback` и `http://localhost:3000/cabinet/auth/google/callback`, значения в `apps/api/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `API_PUBLIC_URL=http://localhost:3000`).

## Telegram-боты

Боты разные, и путать их не надо:

| Бот | Переменные | Для чего |
|-----|-----------|----------|
| Служебный | `TG_BOT_API_KEY`, `TG_BOT_CHAT_ID` | пишет в чат команды: регистрации клубов, алерты диска от `pafpaf-janitor` |
| Клиентский | `TG_CLIENT_BOT_API_KEY`, `TG_CLIENT_BOT_USERNAME` | вход в кабинет через Telegram и сообщения в личку; chat id не нужен — бот пишет каждому сам; `/setdomain` → `club.<домен>` |
| Вход в CRM (необязательный) | `TG_CRM_BOT_API_KEY`, `TG_CRM_BOT_USERNAME` | кнопка Telegram на входе в CRM; Telegram Login привязан к одному домену бота, поэтому `/setdomain` → `crm.<домен>` |

Токен обоих — у [@BotFather](https://t.me/BotFather): `/newbot` → имя → username → в ответе `HTTP API token`.

### Как узнать `TG_BOT_CHAT_ID`

1. Создать группу для логов, добавить служебного бота и дать ему права админа — иначе он не видит сообщения.
2. Написать в группе любое сообщение, например `/start@имя_бота`.
3. Открыть в браузере `https://api.telegram.org/bot<TG_BOT_API_KEY>/getUpdates` и найти `"chat":{"id":-100…}` — это и есть chat id. У групп он отрицательный, у супергрупп начинается с `-100`.

Грабли: пустой `result` — у бота включён Group Privacy (@BotFather → Bot Settings → Group Privacy → Turn off) либо после последнего `getUpdates` не было новых сообщений. Ошибка 409 — на боте висит webhook: снять `/deleteWebhook`, взять id, вернуть webhook. Если в группе включены темы, для конкретной темы понадобится ещё `message_thread_id` из того же ответа.

Значения — в Dokploy → Environment → Deploy. Локально те же ключи лежат в `apps/api/.env`; с ними сообщения уходят в настоящий чат.

## Уборка диска

Диск сервера общий с диванами. 12.10.2026 он заполнился до 100 %: каждый деплой скачивает свежие образы, а прежние остаются лежать без тега. Все Postgres на сервере ушли в перезапуски, API и панель перестали отвечать.

За диском следит сервис `pafpaf-janitor`. Код — `apps/api/src/modules/disk-janitor`, процесс — `node dist/janitor.main` из образа API.

- **Каждую ночь в 04:00 по Мадриду** удаляет образы без тега, которые не использует ни один контейнер, и кэш сборки, не нужный дольше суток.
- **Каждые 10 минут** проверяет диск. Если занято `JANITOR_DISK_ALERT_PERCENT` (85 %) и больше, сразу чистит образы без тега и весь неиспользуемый кэш сборки. Не помогло — пишет в Telegram и напоминает раз в 6 часов, пока диск не освободится.
- **Telegram** — тот же чат, что для регистраций клубов (`TG_BOT_API_KEY`, `TG_BOT_CHAT_ID`). Ночной отчёт приходит, только если освобождено больше 1 ГБ; ошибки — сразу.
- **Не трогает** образы с тегом, контейнеры и тома. Мусор чистит у всех проектов сервера: образы без тега и неиспользуемый кэш не нужны никому.
- **Почему отдельный контейнер.** Сокет Docker даёт права root на сервере, поэтому его получает только этот контейнер: без портов, домена, базы и секретов API, с файловой системой только для чтения и без capabilities.
- **Проверить после деплоя:** логи `pafpaf-janitor` в Dokploy. При старте там `disk N%, свободно …` и `Docker is reachable`. Если Docker недоступен, сообщение придёт и в Telegram.
- **Локально:** `pnpm --filter api build && pnpm --filter api janitor:start`. На Windows задать `JANITOR_DOCKER_SOCKET=\\.\pipe\docker_engine`. С `apps/api/.env` сообщения уйдут в настоящий Telegram-чат.

У самого Dokploy есть своя уборка: Settings → Web Server → Daily Docker Cleanup. На сервере она включена и каждый день в 23:50 удаляет все остановленные контейнеры, все неиспользуемые образы и весь кэш сборки на сервере, тома не трогает. Две уборки друг другу не мешают. Если её выключить, останется только `pafpaf-janitor`, и всё, что делается с диском, видно в коде.

## Бэкапы

Настраиваются в Dokploy, в репозитории для них ничего нет.

1. **Хранилище.** Settings → S3 Destinations: отдельный bucket в ЕС (AWS `eu-north-1` или Hetzner Object Storage) с отдельным ключом доступа только к нему. Срок хранения 30 дней: правило lifecycle в bucket или число копий в настройке бэкапа.
2. **Базы.** В Compose-сервисе `pafpaf`, вкладка Backups: сервис `pafpaf-postgres`, PostgreSQL, пользователь `POSTGRES_USER`. Две задачи — базы `pafpaf` и `site`, каждый день ночью, например `30 3 * * *`. Если такой вкладки у Compose нет, сначала обновить Dokploy: копия тома работающего Postgres ненадёжна.
3. **Медиа сайта.** Volume Backups: том `site_media`, раз в сутки.
4. **Файлы участников** (сканы, подписи) лежат в S3 `AWS_BUCKET_NAME`, не на сервере. Включить в этом bucket versioning, чтобы удаление можно было откатить.
5. **Проверка восстановления** — один раз сразу после настройки, потом раз в квартал. Скачать свежий дамп `pafpaf` из bucket и развернуть его во временную базу на сервере:

   ```bash
   C=$(docker ps --format '{{.Names}}' | grep pafpaf-postgres)
   docker exec "$C" createdb -U pafpaf restore_check
   gunzip -c pafpaf-backup.sql.gz | docker exec -i "$C" pg_restore -U pafpaf -d restore_check --no-owner
   docker exec "$C" psql -U pafpaf -d restore_check -c "select count(*) from portals; select count(*) from members;"
   docker exec "$C" dropdb -U pafpaf restore_check
   ```

   Если `pg_restore` пишет, что формат не тот, дамп — обычный SQL: вместо `pg_restore` подать его в `psql -U pafpaf -d restore_check`. Количество клубов и участников должно совпасть с продом.

