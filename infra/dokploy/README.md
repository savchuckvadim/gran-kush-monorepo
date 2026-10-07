# PafPaf на Dokploy

Отдельный проект на том же сервере и в той же панели Dokploy, где работают диваны. Чужие проекты на сервере не трогаем. Остальной `infra/` здесь не используется: его nginx занимает порт 80, а на сервере этот порт уже у Traefik. SSH-деплой из `deploy.yml` к этой схеме не относится: без SSH-секретов он не запускается.

## Как устроено

- Один Compose-сервис из `infra/dokploy/docker-compose.yml`. В нём Postgres, Redis, API, CRM, кабинет участника, админка платформы и сайт.
- Портов наружу нет. Трафик по доменам раздаёт Traefik, а Postgres и Redis доступны только внутри проекта.
- Образы собирает GitHub Actions (`.github/workflows/deploy.yml`) при каждом push в `main` и кладёт в ghcr.io. Сервер ничего не собирает.
- Секреты хранятся только в Dokploy, на вкладке Environment. В git лежит только `.env.example`.
- У каждого сервиса есть лимит памяти, потому что сервер общий с продакшеном диванов. В сумме лимиты около 3,7 ГБ, обычно занято меньше.

| Домен | Сервис | Что это |
|---|---|---|
| `paf-paf.app` | `pafpaf-site` | сайт и админка контента на `/admin` |
| `crm.paf-paf.app` | `pafpaf-crm` | CRM клуба |
| `club.paf-paf.app` | `pafpaf-web` | кабинет участника и страницы клубов |
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

- Репозиторий → Settings → Secrets and variables → Actions → **Variables**:
  - `NEXT_PUBLIC_API_URL` = `https://api.paf-paf.app`;
  - `NEXT_PUBLIC_CRM_URL` = `https://crm.paf-paf.app`.

  Эти адреса вшиваются в образы при сборке. После их смены запустите сборку заново: Actions → Deploy → Run workflow.
- Токен для скачивания образов: настройки профиля → Developer settings → Personal access tokens (classic), право `read:packages`.

### Dokploy

1. Settings → Registry → добавить `ghcr.io` с логином GitHub и токеном из шага выше. Если деплой потом не сможет скачать образ, один раз выполните `docker login ghcr.io` в терминале сервера (Dokploy → Terminal).
2. Projects → Create Project → `pafpaf`.
3. Create Service → **Compose**, тип Docker Compose:
   - провайдер GitHub, репозиторий `savchuckvadim/gran-kush-monorepo`, ветка `main`;
   - Compose Path: `./infra/dokploy/docker-compose.yml`;
   - **Autodeploy выключить**. Иначе Dokploy начнёт деплой сразу после push, пока GitHub ещё собирает новые образы.
4. Environment: вставить `infra/dokploy/.env.example` и заполнить.
   - Секреты генерируются командой `openssl rand -hex 32`.
   - Обязательные переменные помечены `(required)`. Пока хоть одна пустая, деплой останавливается с понятной ошибкой.
5. Domains: заполнить по таблице выше (домен, сервис, порт 3000, HTTPS, сертификат Let's Encrypt).
6. Deploy.

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

- **Обновление.** Push в `main` → GitHub Actions «Deploy» собирает образы (около 10 минут) → в Dokploy нажать Deploy. Каждый деплой скачивает свежие образы.
- **Откат.** В Environment указать `TAG=sha-<полный хеш коммита>` и нажать Deploy. Когда исправление выкачено, вернуть `TAG=latest`.
- **Изменились коллекции или блоки Payload.** Нужна миграция: локально выполнить `pnpm --filter site migrate:create <имя>` и закоммитить. В проде она применится при старте сайта.

## Пока не сделано

- Бэкапы Postgres и тома с медиа сайта: `pg_dump` по расписанию или Volume Backups в Dokploy.
- Автоматический деплой после сборки образов, например вебхуком Dokploy из `deploy.yml`. Пока деплой запускается кнопкой.
