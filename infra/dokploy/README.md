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
| `club.paf-paf.app` | `pafpaf-web` | кабинет участника и страницы клубов; по умолчанию выключен, включается `COMPOSE_PROFILES=club` |
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

  Эти адреса вшиваются в образы при сборке. Если они не заданы, в CRM попадает `http://localhost:3000`, и CRM не достучится до API. После их смены запустите сборку заново: Actions → Deploy → Run workflow.
- Токен для образов не нужен, пока репозиторий публичный: образы в ghcr тоже публичные.

### Dokploy

1. Projects → Create Project → `pafpaf`.
2. Create Service → **Compose**, тип Docker Compose:
   - провайдер Git, URL `https://github.com/savchuckvadim/gran-kush-monorepo.git`, ветка `main`. Репозиторий публичный, поэтому ключ не нужен;
   - Compose Path: `./infra/dokploy/docker-compose.yml`;
   - **Autodeploy выключить**. Иначе Dokploy начнёт деплой сразу после push, пока GitHub ещё собирает новые образы.
3. Environment: вставить `infra/dokploy/.env.example` и заполнить.
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

- **Обновление.** Push в `main` → GitHub Actions «Deploy» собирает образы (около 10 минут) → в Dokploy нажать Deploy. Каждый деплой скачивает свежие образы.
- **Откат.** В Environment указать `TAG=sha-<полный хеш коммита>` и нажать Deploy. Когда исправление выкачено, вернуть `TAG=latest`.
- **Изменились коллекции или блоки Payload.** Нужна миграция: локально выполнить `pnpm --filter site migrate:create <имя>` и закоммитить. В проде она применится при старте сайта.

## Почта

Письма (подтверждение email, сброс пароля, приглашения) уходят по SMTP. Провайдер должен быть в ЕС: передавать адреса участников клубов за пределы ЕЭЗ нельзя, а для России, например Beget, нет решения об адекватности.

- **Amazon SES, регион `eu-north-1`.** AWS у нас уже субобработчик, файлы лежат в том же регионе. Хост `email-smtp.eu-north-1.amazonaws.com`. SMTP-логин и пароль создаются в консоли SES, ключи IAM для этого не подходят. Домен `paf-paf.app` подтвердить записями DKIM в Cloudflare и запросить production access: в sandbox SES шлёт только на подтверждённые адреса.
- **Brevo** (Франция) — запасной вариант: `smtp-relay.brevo.com`.

В Environment: `MAIL_HOST`, `MAIL_PORT=587` (Hetzner закрывает 25 и 465), `MAIL_LOGIN`, `MAIL_PASSWORD`, `SMTP_FROM`, например `PafPaf <no-reply@paf-paf.app>`. В DNS — SPF и DMARC для домена отправителя.

Если `MAIL_HOST` пустой, API пытается слать через localhost: письма не уходят, а в логах `pafpaf-api` появляется `Error sending email`. Проверить после настройки три письма: регистрация клуба, сброс пароля в CRM, приглашение сотрудника. В логах должно быть `Email successfully sent`.

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

## Пока не сделано

- Автоматический деплой после сборки образов, например вебхуком Dokploy из `deploy.yml`. Пока деплой запускается кнопкой.
