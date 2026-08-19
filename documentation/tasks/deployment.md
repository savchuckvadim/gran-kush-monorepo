# Деплой Gran Kush: выбор хостинга + CI/CD

Дата ресерча: 2026-07-31. Ветка: `fix/entity-records-rbac`.

Цель: поднять staging/prod так, чтобы (а) стоило дёшево, (б) и Вадим, и Claude Code могли
подключаться по SSH и автоматизировать, (в) деплой шёл из GitHub Actions по push.

> **Что уже есть в репозитории** (не нужно писать заново): `infra/compose/docker-compose.prod.yml`
> — полный стек (postgres, redis, api, crm, web, admin, nginx с host-based routing),
> `infra/docker/api.Dockerfile` + `next.Dockerfile`, entrypoint с `prisma migrate deploy`.
> Из инфраструктуры **не хватает**: выбранного сервера, TLS, deploy-workflow,
> registry для образов и бэкапов БД.
> **Есть (2026-08-08):** `.github/workflows/ci.yml` — lint/typecheck/unit + e2e
> с Postgres/Redis services на каждый push; первая половина шага 5 закрыта.
> **Есть (2026-08-19):** `.github/workflows/deploy.yml` (build+push 4 образов в ghcr.io
> на push в `main`; SSH-деплой автоскипается, пока не заданы `SSH_*` секреты) и
> `infra/compose/docker-compose.deploy.yml` (override `build:` → `image: ghcr.io/...:${TAG}`).
> Шаги 4–5 закрыты кодом; остались только серверные действия: заказ машины, TLS,
> секреты/переменные в GitHub, `docker login ghcr.io` на сервере, бэкапы.

---

## 1. Требования к железу

Что реально крутится в проде: Postgres 16, Redis 7, NestJS API, **три** Next.js standalone
приложения (crm/web/admin), nginx.

| Компонент                              | RAM в покое        |
| -------------------------------------- | ------------------ |
| postgres                               | ~150–250 MB        |
| redis                                  | ~30–50 MB          |
| api (NestJS + Prisma)                  | ~250–400 MB        |
| crm / web / admin (Next standalone ×3) | ~100–150 MB каждый |
| nginx                                  | ~10–20 MB          |
| **Итого runtime**                      | **~1.1–1.6 GB**    |

Выводы:

- **2 GB RAM — впритык**, без запаса на пики и на `prisma migrate`. Годится только для staging.
- **4 GB RAM — рабочий минимум** для прода на одной машине.
- **Сборку образов на сервере не делать.** `next build` для трёх приложений съедает 2–4 GB и
  минуты CPU. Собирать в GitHub Actions → пушить в registry → на сервере только `docker compose pull && up -d`.
  Это же снимает требование к CPU сервера (хватает 2 vCPU).
- Диск: 40 GB достаточно на старте (образы ~2–3 GB, Postgres растёт медленно).

---

## 2. Варианты хостинга

### Сводка

| Провайдер                    | План                                  | vCPU / RAM / диск   | Цена/мес               | ES-локация                         | Вердикт                                          |
| ---------------------------- | ------------------------------------- | ------------------- | ---------------------- | ---------------------------------- | ------------------------------------------------ |
| **Hetzner Cloud**            | CX23                                  | 2 / 4 GB / 40 GB    | **~€4–5.5**            | ❌ нет (DE/FI)                     | 🥇 лучшая цена, латентность из Мадрида ~35–45 мс |
| **Hetzner Cloud**            | CX33                                  | 4 / 8 GB / 80 GB    | ~€6.5                  | ❌ нет                             | 🥇 запас на рост, всё ещё дёшево                 |
| **IONOS VPS Linux M**        | VPS M                                 | 2 / 4 GB / 160 GB   | ~$9 (первые 6 мес ~$6) | ✅ **Испания**                     | 🥈 если нужен ES-датацентр                       |
| **OVHcloud VPS**             | VPS-1                                 | 4 / 8 GB            | ~$6.5                  | ⚠️ ЕС (FR/DE/PL), ES под вопросом  | 🥈 хорошая цена/RAM                              |
| **AWS Lightsail**            | 4 GB bundle                           | 2 / 4 GB / 80 GB    | ~$24                   | ✅ **Europe (Spain)** с 12.06.2026 | 🥉 дорого за те же ресурсы, но родной AWS-контур |
| **GCP Compute**              | e2-medium, europe-southwest1 (Мадрид) | 2 / 4 GB            | ~$70–80                | ✅ Мадрид                          | ❌ в 15 раз дороже Hetzner                       |
| **Oracle Cloud Always Free** | Ampere A1 ARM                         | 2–4 OCPU / 12–24 GB | **$0**                 | ❌ Мадрида во free нет             | ⚠️ только staging, см. ниже                      |

### Разбор

**Hetzner — рекомендация по умолчанию.** Радикально дешевле всех: CX23 (2 vCPU / 4 GB / 40 GB NVMe)
стоит порядка €4–5.5/мес — примерно в 5 раз дешевле Lightsail за те же ресурсы и в 15 раз дешевле GCP
Мадрида. Испанского датацентра у Hetzner **нет** (только Falkenstein/Nuremberg в Германии и Helsinki),
но Falkenstein → Мадрид даёт ~35–45 мс RTT — для CRM, где клиент дёргает API десятками запросов на
экран, это незаметно. Осторожно: в 2026 Hetzner поднимал цены несколько раз (апрель, 15 июня),
цены в источниках расходятся (€3.49 / €3.99 / €5.49) — **свериться в консоли перед заказом**.

**Если принципиален датацентр в Испании** (GDPR-аргумент в продажах испанским клубам, data residency
в договоре) — **IONOS VPS Linux M**: 2 vCPU / 4 GB / 160 GB, ~$9/мес, Испания в списке локаций.
Дороже Hetzner вдвое, но всё ещё втрое дешевле Lightsail. Это единственный внятный повод не брать Hetzner.

**AWS Lightsail** стал доступен в регионе **Europe (Spain)** 12 июня 2026. Плюс — если потом нужен
S3/SES/RDS в том же регионе, всё рядом и по одному счёту. Минус — ~$24/мес за 4 GB против €4–5.5 у Hetzner.
Входные $3.50 (IPv6-only nano) и $5 — это 512 MB RAM, для нашего стека бесполезно.

**Oracle Always Free** — заманчиво ($0 за ARM-машину), но: в июне 2026 free-квоту ARM урезали
с 4 OCPU/24 GB до 2 OCPU/12 GB; в популярных регионах хронический «out of capacity»; Мадрида во
free-тарифе нет; аккаунты периодически ресетят за неактивность. **Как прод — нет.** Как бесплатный
staging/preview-контур — вполне, если не жалко времени на возню с квотами.

**GCP/Azure Мадрид** — отпадают по цене: e2-medium в europe-southwest1 порядка $70–80/мес.
Managed-сервисы (Cloud SQL) добавят ещё столько же. Смысл появится, только когда пойдёт нагрузка
и понадобится managed Postgres с HA.

### Итоговая рекомендация

1. **Прод: Hetzner CX33** (4 vCPU / 8 GB / 80 GB, ~€6.5/мес) — берём сразу с запасом, разница с CX23
   в пару евро, а 8 GB снимают вопрос «хватит ли» на год вперёд. Локация Falkenstein.
2. **Если клуб-клиент требует данные в Испании** — IONOS VPS Linux M (~$9/мес, Мадрид).
   Переезд = смена IP в DNS + `docker compose up`, стек переносится как есть.
3. **Staging** — второй CX23 (~€4–5.5) или Oracle Free, если хочется в ноль.

Итого стартовый бюджет: **~€7–12/мес** за прод + staging. Домены и Cloudflare — бесплатно.

---

## 3. Пошаговый план

### Шаг 1. Заказать сервер и закрыть базовую безопасность

1. Hetzner Cloud → Project → Add Server: Falkenstein, Ubuntu 24.04, тип CX33.
   При создании **добавить SSH-ключ** (свой + отдельный ключ для CI, см. шаг 5).
2. Создать non-root пользователя с sudo и docker-группой:
    ```bash
    adduser deploy && usermod -aG sudo,docker deploy
    rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
    ```
3. Отключить парольный вход и root-логин в `/etc/ssh/sshd_config`:
   `PasswordAuthentication no`, `PermitRootLogin no` → `systemctl restart ssh`.
4. Firewall (в панели Hetzner Cloud Firewall — надёжнее локального ufw):
   разрешить только 22, 80, 443. Postgres/Redis наружу **не публиковать** — в compose они уже
   не имеют `ports:`.
5. `unattended-upgrades` для security-патчей.

**DoD:** `ssh deploy@<ip>` работает по ключу, пароль не принимается, `docker ps` доступен без sudo.

### Шаг 2. Docker + сам стек

1. Установить Docker Engine + compose plugin (официальный apt-репозиторий Docker, не snap).
2. Склонировать репозиторий в `/opt/gran-kush` (deploy key на GitHub, read-only).
3. Заполнить конфиги:
    ```bash
    cp infra/compose/.env.example        infra/compose/.env
    cp infra/compose/env/api.env.example infra/compose/env/api.env
    ```
    Критично проставить: `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`
    (генерировать `openssl rand -base64 48`), `AUTH_COOKIE_SECURE=true`, `CORS_ORIGIN`,
    `API_HOST`/`CRM_HOST`/`WEB_HOST`/`ADMIN_HOST`, `NEXT_PUBLIC_API_URL` (публичный https-URL, он
    вшивается в браузерный бандл на этапе **сборки**).
4. Первый запуск: `pnpm docker:prod`. Миграции применятся сами (`RUN_MIGRATIONS=true`).
5. Разово засеять платформенного админа: `RUN_SEED=true` на первый бут либо
   `docker compose ... exec api pnpm prisma:seed:admin`.

**DoD:** `curl -H "Host: $API_HOST" http://<ip>/docs` отдаёт Swagger.

### Шаг 3. Домены и TLS

В `infra/README.md` честно написано, что nginx слушает только `:80`, а TLS предполагается снаружи.
Два пути:

- **Вариант A (проще, рекомендую): Cloudflare proxy.** DNS A-записи `api.` / `crm.` / `lk.` / `admin.`
  на IP сервера, оранжевое облако включено, SSL/TLS mode = **Full**. TLS терминируется на Cloudflare,
  сертификаты бесплатны и автопродлеваются, попутно DDoS-защита и кэш статики. На сервере ничего не меняется.
  Нюанс: включить «Always Use HTTPS» и убедиться, что `AUTH_COOKIE_SECURE=true` — куки `SameSite=Lax`
    - `Secure` через прокси работают штатно.
- **Вариант B: certbot на сервере.** Раскомментировать `443` и `certs` volume в
  `docker-compose.prod.yml`, добавить `listen 443 ssl` в `infra/docker/nginx/templates/default.conf.template`,
  повесить certbot в контейнере с webroot-челленджем. Больше контроля, но обслуживать самому.

**DoD:** все четыре поддомена открываются по https, логин в CRM ставит `crm_access_token` с флагом `Secure`.

### Шаг 4. Registry для образов

Собирать на сервере нельзя (см. §1), значит нужен registry. **GitHub Container Registry (ghcr.io)** —
бесплатен для приватных образов в разумных объёмах и не требует заводить ещё один аккаунт.

1. ✅ В GH Actions пушим `ghcr.io/savchuckvadim/gran-kush/{api,crm,web,admin}:sha-<commit>` и `:latest`
   (`deploy.yml`, права — встроенный `GITHUB_TOKEN` с `packages: write`, отдельный PAT не нужен).
2. На сервере — `docker login ghcr.io` с PAT (scope `read:packages`), сохранённый в `~/.docker/config.json`.
3. ✅ `infra/compose/docker-compose.deploy.yml` — override: `build: !reset null` +
   `image: ghcr.io/...:${TAG:-latest}`; локальная сборка через `docker:prod` не затронута.
   Требует Docker Compose ≥ 2.24 на сервере (из-за `!reset`).

**DoD:** `docker compose -f ... pull` на сервере тянет образы без ошибок авторизации.

### Шаг 5. GitHub Actions: CI + CD

Два workflow.

**`.github/workflows/ci.yml`** — ✅ сделан (2026-08-08, push в любую ветку + workflow_dispatch).
Нюансы, которые пришлось решить: pnpm 10 пробрасывает `--` в jest буквально → скрипт
`test:e2e:ci`; e2e требуют `MEMBER_AUTH_COOKIE_DOMAIN`/`CRM_AUTH_COOKIE_DOMAIN`;
jest не выходит из-за Redis-хэндлов → `--forceExit`. Состав:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm --filter api typecheck && pnpm --filter crm typecheck && pnpm --filter web typecheck`
- `pnpm --filter api test`
- e2e с сервисными контейнерами Postgres + Redis (`services:` в job) — сейчас сьют требует живую БД,
  без неё виснет.

**`.github/workflows/deploy.yml`** — ✅ сделан (2026-08-19, push в `main` + `workflow_dispatch`):

1. ✅ Build & push 4 образов (matrix) в ghcr.io с тегами `sha-<commit>` и `latest`;
   `docker/build-push-action@v6` + `cache-from/to: type=gha, scope=<app>`;
   `NEXT_PUBLIC_*` идут как `build-args` из repository **variables**.
   Нюанс: оба Dockerfile делают `COPY . .` до `pnpm install`, поэтому gha-кэш слоёв
   почти не спасает от полной пересборки — если билды будут тормозить, вынести
   копирование манифестов + `pnpm fetch` в отдельный слой.
2. ✅ Деплой по SSH голым `ssh` (без сторонних actions): `git pull --ff-only` →
   `TAG=sha-<commit>` → `compose pull` → `up -d --remove-orphans` → `docker image prune -f`.
   Пока `SSH_*` секреты не заданы, job **скипается автоматически** (job `server-check`),
   а образы всё равно пушатся — CD включится сам, как только появятся секреты.
3. ✅ Smoke-check: `curl -fsS $SMOKE_CHECK_URL` с ретраями; шаг скипается, если переменная пуста.

**Секреты репозитория:** `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (отдельный ключ только для деплоя).
`GHCR_TOKEN` в Actions не нужен — push идёт по встроенному `GITHUB_TOKEN`; PAT нужен только
на сервере для `docker login ghcr.io` (pull).
**Переменные репозитория (vars):** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CRM_URL`,
`NEXT_PUBLIC_MAIN_SITE_URL`, `SMOKE_CHECK_URL` (например `https://api.<домен>/docs-json`).
Смена `NEXT_PUBLIC_*` = пересборка образов (они вшиты в бандл).

**DoD:** push в `main` → через ~6–10 минут прод обновлён, миграции применены, smoke-check зелёный.

### Шаг 6. Доступ для Claude Code

Чтобы я мог работать с сервером напрямую:

- Отдельный SSH-ключ (не тот, что у CI), запись в `~/.ssh/config` на машине Вадима:
    ```
    Host gran-kush-prod
        HostName <ip>
        User deploy
        IdentityFile ~/.ssh/gran_kush_prod
    ```
    Тогда я работаю через `ssh gran-kush-prod "docker compose ... logs --tail=100 api"` без явных IP и ключей в переписке.
- Права: `deploy` в группе docker, sudo — по паролю. Разрушающие операции (`down -v`, `prisma migrate reset`)
  **не запускать** без явного подтверждения — на них живые данные клубов.
- Логи: `docker compose logs` + ротация (`json-file` driver, `max-size: 10m`, `max-file: 3` в compose) —
  иначе логи съедят диск за пару месяцев.

### Шаг 7. Бэкапы (не пропускать)

Единственная машина = единственная копия данных. Минимум:

1. Ночной `pg_dump` в контейнере → `/opt/backups/gran-kush-$(date +%F).sql.gz`, хранить 14 дней.
2. Выгрузка дампов во внешнее хранилище: Hetzner Storage Box (~€3/мес за 1 TB) или S3-совместимый бакет.
3. **Раз в квартал проверять восстановление** — непроверенный бэкап не бэкап.
4. Дополнительно: снапшоты сервера в панели Hetzner (~20% от стоимости сервера, копейки).

---

## 4. Порядок выполнения

| #   | Шаг                                   | Оценка | Блокирует              |
| --- | ------------------------------------- | ------ | ---------------------- |
| 1   | Заказ сервера + hardening SSH         | 1 ч    | всё                    |
| 2   | Docker + первый ручной `up`           | 1–2 ч  | 3, 5                   |
| 3   | Домены + Cloudflare TLS               | 1 ч    | реальное использование |
| 4   | ghcr.io + `docker-compose.deploy.yml` | 1–2 ч  | 5                      |
| 5   | CI + CD workflows                     | 3–4 ч  | автоматизацию          |
| 6   | SSH-доступ для Claude                 | 15 мин | —                      |
| 7   | Бэкапы + ротация логов                | 1–2 ч  | прод-готовность        |

Суммарно ~1.5 рабочих дня до состояния «push в main → прод обновился».

Разумный порядок: 1 → 2 → 3 (получаем живой ручной прод) → 4 → 5 (автоматизируем) → 7 (страхуемся).
Шаг 6 — в любой момент после 1.

---

## 5. Открытые вопросы к Вадиму

1. **Нужен ли датацентр физически в Испании** для аргумента в продажах / договоров с клубами?
   Если да — IONOS вместо Hetzner (+~$4/мес). Если «лишь бы ЕС» — Hetzner.
2. **Домен**: `el-gran-kush.ru` уже фигурирует в `infra/README.md` как пример. Для испанского рынка
   логичнее `.es`/`.com` — определиться до настройки TLS, иначе переделывать сертификаты и
   `NEXT_PUBLIC_*` (они вшиты в бандл, смена = пересборка фронтов).
3. **`apps/admin` деплоим?** По аудиту это заглушка (только auth). Если не нужен сейчас — убрать из
   compose, это минус ~150 MB RAM и минус один образ в CI.
4. **Почта**: сейчас SMTP через `MAIL_*`. Для прода с испанскими клубами нужен нормальный отправитель
   (SES / Resend / Brevo), иначе письма о регистрации уедут в спам.

---

## Источники

- [Hetzner Cloud pricing 2026 (CX23/CX33)](https://comparedge.com/tools/hetzner/pricing) ·
  [Hetzner price adjustment 15.06.2026](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) ·
  [Hetzner locations](https://docs.hetzner.com/cloud/general/locations/)
- [Amazon Lightsail теперь в Europe (Spain), 12.06.2026](https://aws.amazon.com/about-aws/whats-new/2026/06/amazon-lightsail-aws-regions/) ·
  [Lightsail pricing 2026](https://kuberns.com/blogs/aws-lightsail-pricing-your-comprehensive-guide/)
- [Oracle Cloud free tier: 4 OCPU/24GB урезали до 2 OCPU/12GB](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/)
- [IONOS VPS планы и локации (включая Испанию)](https://www.comparevps.com/hosting/ionos)
- [GCP General Purpose VM pricing](https://cloud.google.com/products/compute/pricing/general-purpose)
- [Рост цен на VPS в 2026: Hetzner, OVH, Hostinger](https://abdulkadersafi.com/blog/vps-prices-are-rising-everywhere-in-2026-hetzner-ovhcloud-hostinger)
