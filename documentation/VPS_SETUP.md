# Развёртывание на чистом VPS (Hetzner + Cloudflare)

Пошаговый рунбук: от заказа сервера до работающего прода с HTTPS и автодеплоем.
Рассчитан на выполнение подряд, сверху вниз, за один заход (~40–60 минут).

Справочник по инфраструктуре — [DEPLOYMENT.md](./DEPLOYMENT.md): что где лежит, как устроен
CI/CD, что учитывать при масштабировании. Здесь — только последовательность действий.

Домен в примерах — `nagual.club`. Замените на свой везде, включая env-файлы.

---

## 0. Что понадобится заранее

- Аккаунт [Hetzner Cloud](https://console.hetzner.cloud) (карта или PayPal).
- Домен, делегированный на Cloudflare (NS-записи регистратора указывают на Cloudflare).
- SSH-ключ. Если его нет: `ssh-keygen -t ed25519 -C "you@example.com"`.
- Доступ к репозиторию на GitHub с правом менять Settings → Secrets and variables.
- Ключи S3 и SMTP (без них файлы и письма не работают, всё остальное — да).

---

## 1. Заказать сервер

Hetzner Cloud → **Add Server**:

| Параметр | Значение | Почему |
|----------|----------|--------|
| Location | Falkenstein или Nuremberg | ЕС для RGPD, ~35 мс до Мадрида |
| Image | Ubuntu 24.04 | LTS, докер ставится штатно |
| Type | **CX32** (4 vCPU, 8 ГБ, 80 ГБ NVMe) | 6 контейнеров + сборка; CX22 с 4 ГБ впритык |
| Networking | IPv4 + IPv6 | IPv4 нужен для Cloudflare A-записи |
| SSH key | загрузить публичный ключ | пароль по SSH не нужен вообще |
| Firewall | пока пропустить | настроим на сервере через ufw |

Диск на 80 ГБ — это база, образы и дампы. Расширяется без пересоздания сервера, начинать с большего смысла нет.

После создания записываем публичный IPv4 — он понадобится в §3.

---

## 2. Базовая настройка сервера

Заходим под root по адресу из панели:

```bash
ssh root@<IP>
```

### 2.1 Пользователь для деплоя

Работать под root не нужно, а CD-workflow ходит именно этим пользователем:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

### 2.2 Запретить вход по паролю

```bash
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl restart ssh
```

Проверьте вход `ssh deploy@<IP>` **из другого терминала, не закрывая текущий** — иначе есть шанс
запереть себя снаружи.

### 2.3 Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

> **Грабля: Docker обходит ufw.** Опубликованный через `ports:` порт Docker открывает правилами
> в цепочке `DOCKER`, минуя ufw, и `ufw deny` его не закроет. Сейчас это безопасно: наружу
> публикуется только nginx (80/443), а Postgres и Redis портов на хост не пробрасывают.
> Но если раскомментируете `ports` у postgres в compose — база окажется доступна из интернета,
> и ufw об этом не предупредит. Не делайте этого; для доступа к базе используйте SSH-туннель (§9).

### 2.4 Swap

Образы Hetzner идут без swap. Два гигабайта — дешёвая страховка от OOM при пиковых миграциях:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 2.5 Время — UTC

Оставьте системную зону UTC (`timedatectl` должен показывать `UTC`). Префикс номера заказа
и дневная граница нумерации считаются в UTC — при локальной зоне сервера нумерация поедет
(разбор в [scaling-roadmap.md](./tasks/scaling-roadmap.md), TASK-108).

### 2.6 Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
docker compose version   # должно быть >= 2.24
```

Версия Compose ниже 2.24 не понимает `!reset null` в оверлее и попытается собирать образы
прямо на сервере. Официальный скрипт ставит актуальную.

Дальше всё делаем под `deploy`:

```bash
exit
ssh deploy@<IP>
```

---

## 3. DNS в Cloudflare

В Cloudflare → домен → **DNS** → Add record. Четыре A-записи на IP сервера,
все **с включённым проксированием** (оранжевое облако):

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `<IP>` | Proxied |
| A | `api` | `<IP>` | Proxied |
| A | `crm` | `<IP>` | Proxied |
| A | `admin` | `<IP>` | Proxied |

Опционально `CNAME www → nagual.club` (Proxied) — nginx этот хост уже обрабатывает.

Затем **SSL/TLS → Overview → Full (strict)** и **Edge Certificates → Always Use HTTPS: On**.
Редирект с http на https сделает край Cloudflare, отдельный редирект в nginx не нужен.

> Режим **Flexible** не включайте: Cloudflare пойдёт на origin по http, `AUTH_COOKIE_SECURE=true`
> не пропустит куки, и логин будет молча не работать.

---

## 4. Сертификат для origin

Используем Cloudflare Origin CA — сертификат на 15 лет, доверенный только со стороны Cloudflare.
Никакого ACME, продления и челленджей по 80 порту.

Cloudflare → **SSL/TLS → Origin Server → Create Certificate**:

- Private key type: RSA (2048)
- Hostnames: `nagual.club` и `*.nagual.club` — **обязательно оба**, wildcard нужен для будущих
  поддоменов клубов (`club1.nagual.club`)
- Validity: 15 лет

Cloudflare покажет сертификат и ключ **один раз**. Кладём их на сервер:

```bash
mkdir -p /opt/gran-kush-certs
nano /opt/gran-kush-certs/origin.pem   # вставить Origin Certificate
nano /opt/gran-kush-certs/origin.key   # вставить Private Key
chmod 600 /opt/gran-kush-certs/origin.key
```

Положим их в репозиторий на шаге 5 — каталог `infra/docker/nginx/certs/` в `.gitignore`,
в git они не попадут.

---

## 5. Репозиторий и переменные

```bash
sudo mkdir -p /opt/gran-kush && sudo chown deploy:deploy /opt/gran-kush
git clone https://github.com/savchuckvadim/gran-kush-monorepo.git /opt/gran-kush
cd /opt/gran-kush

mv /opt/gran-kush-certs/origin.pem infra/docker/nginx/certs/origin.pem
mv /opt/gran-kush-certs/origin.key infra/docker/nginx/certs/origin.key

cp infra/compose/.env.example        infra/compose/.env
cp infra/compose/env/api.env.example infra/compose/env/api.env
```

Сгенерируйте секреты (каждую команду — по разу, значения подставьте в файлы):

```bash
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 32   # COOKIE_SECRET
openssl rand -hex 32   # ENCRYPTION_MASTER_KEY  (ровно 64 hex-символа)
openssl rand -hex 24   # POSTGRES_PASSWORD
```

`nano infra/compose/.env` — домены уже проставлены под `nagual.club`, меняем только пароль БД.

`nano infra/compose/env/api.env` — заполняем JWT/cookie/encryption секреты, S3
(`AWS_REGION`, `AWS_BUCKET_NAME`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`), SMTP и пароль
платформенного администратора.

**Три вещи, из-за которых чаще всего не взлетает:**

1. `CRM_AUTH_COOKIE_DOMAIN` и `MEMBER_AUTH_COOKIE_DOMAIN` — **с ведущей точкой**: `.nagual.club`.
   Читаются через `getOrThrow`, без них API не стартует вообще.
2. `AUTH_COOKIE_SECURE=true` — иначе куки не доедут по https.
3. `ENCRYPTION_MASTER_KEY` **невосстановим**. Потеряете — зашифрованные поля в БД превратятся
   в мусор. Сохраните его в менеджер паролей до первого запуска, а не после.

---

## 6. Первый запуск

Логинимся в реестр образов (PAT с правом `read:packages`):

```bash
echo <GITHUB_PAT> | docker login ghcr.io -u <github-username> --password-stdin
```

Тянем образы, собранные CI, и поднимаем стек с TLS:

```bash
cd /opt/gran-kush
export TAG=latest
docker compose --env-file infra/compose/.env \
  -f infra/compose/docker-compose.prod.yml \
  -f infra/compose/docker-compose.deploy.yml \
  -f infra/compose/docker-compose.tls.yml \
  pull

docker compose --env-file infra/compose/.env \
  -f infra/compose/docker-compose.prod.yml \
  -f infra/compose/docker-compose.deploy.yml \
  -f infra/compose/docker-compose.tls.yml \
  up -d
```

Миграции прогоняются автоматически при старте API (`RUN_MIGRATIONS=true`).

Заводим платформенного администратора — разово:

```bash
docker compose -f infra/compose/docker-compose.prod.yml exec api pnpm prisma:seed:admin
```

### Проверка

```bash
docker compose -f infra/compose/docker-compose.prod.yml ps    # все healthy/running
curl -fsS https://api.nagual.club/health                       # {"status":"ok"}
curl -fsS https://api.nagual.club/ready                        # database/redis: up
```

`/ready` вернёт `503` с телом `{ checks: { database, redis } }`, если какая-то зависимость
не поднялась — по нему сразу видно, кто именно.

Затем откройте `https://crm.nagual.club`, войдите админом и убедитесь, что после логина
следующий запрос не отваливается в 401 (это проверка того, что куки настроены верно).

---

## 7. Автодеплой

Репозиторий → Settings → Secrets and variables → Actions.

**Secrets:**

| Секрет | Значение |
|--------|----------|
| `SSH_HOST` | IP сервера |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | приватный ключ **отдельной** пары для деплоя, не ваш личный |

Для отдельной пары: сгенерируйте `ssh-keygen -t ed25519 -f deploy_key -N ""`, публичную часть
допишите в `/home/deploy/.ssh/authorized_keys` на сервере, приватную — в секрет.

**Variables:**

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_API_URL` | `https://api.nagual.club` |
| `NEXT_PUBLIC_CRM_URL` | `https://crm.nagual.club` |
| `NEXT_PUBLIC_MAIN_SITE_URL` | `https://nagual.club` |
| `SMOKE_CHECK_URL` | `https://api.nagual.club/health` |

После этого push в `main` собирает четыре образа, пушит их в ghcr.io, заходит по SSH,
делает `pull` + `up -d` и проверяет `/health`. TLS-оверлей workflow подключает сам —
по факту наличия `infra/docker/nginx/certs/origin.pem` на сервере.

> `NEXT_PUBLIC_*` вшиваются в браузерные бандлы **на сборке**. Поменяли домен — недостаточно
> перезапустить контейнеры, нужна пересборка образов (то есть новый push или ручной
> `workflow_dispatch`).

---

## 8. Бэкапы

Единственное ценное состояние — том `postgres_data` (файлы лежат в S3, Redis — только очереди).
Ежедневный дамп в 4 утра с хранением две недели:

```bash
mkdir -p /opt/backups
cat > /opt/gran-kush/backup.sh <<'SH'
#!/bin/bash
set -euo pipefail
source /opt/gran-kush/infra/compose/.env
STAMP=$(date -u +%Y%m%d-%H%M)
docker exec gran-kush-postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  | gzip > "/opt/backups/db-$STAMP.sql.gz"
find /opt/backups -name 'db-*.sql.gz' -mtime +14 -delete
SH
chmod +x /opt/gran-kush/backup.sh
(crontab -l 2>/dev/null; echo "0 4 * * * /opt/gran-kush/backup.sh") | crontab -
```

Дамп на том же диске защищает от «уронил таблицу», но не от потери сервера. Настройте выгрузку
в S3 или `rclone` на отдельное хранилище — и **проверьте восстановление** хотя бы раз,
непроверенный бэкап бэкапом не является:

```bash
gunzip -c /opt/backups/db-<stamp>.sql.gz | \
  docker exec -i gran-kush-postgres psql -U <user> -d <db>
```

---

## 9. Эксплуатация

```bash
cd /opt/gran-kush
docker compose -f infra/compose/docker-compose.prod.yml ps
docker compose -f infra/compose/docker-compose.prod.yml logs -f api
docker compose -f infra/compose/docker-compose.prod.yml exec api sh
```

**Доступ к базе с ноутбука** — через SSH-туннель, не открывая порт наружу:

```bash
ssh -L 5432:localhost:5432 deploy@<IP> \
  -- docker compose -f /opt/gran-kush/infra/compose/docker-compose.prod.yml exec postgres true
```

Проще: `docker exec -it gran-kush-postgres psql -U <user> -d <db>` прямо на сервере.

**Откат.** Образы тегируются коммитом, поэтому откат — подстановка старого тега:

```bash
export TAG=sha-<предыдущий-коммит>
docker compose --env-file infra/compose/.env \
  -f infra/compose/docker-compose.prod.yml \
  -f infra/compose/docker-compose.deploy.yml \
  -f infra/compose/docker-compose.tls.yml up -d
```

Откат образов **не откатывает миграции БД** — их откатывают отдельно и осознанно.

---

## 10. Если что-то не работает

| Симптом | Причина | Что делать |
|---------|---------|-----------|
| `521`/`522` от Cloudflare | контейнер nginx не поднялся или закрыт порт | `docker compose ps`, `ufw status` |
| `525` от Cloudflare | SSL mode `Full (strict)`, а сертификата на origin нет | проверьте `infra/docker/nginx/certs/`, поднят ли `tls.yml` |
| nginx падает при старте | `ssl_certificate` указывает на отсутствующий файл | положите `origin.pem`/`origin.key` либо снимите оверлей `tls.yml` |
| Логин проходит, следующий запрос 401 | куки не долетают | домен куки с ведущей точкой, `AUTH_COOKIE_SECURE=true`, `CORS_ORIGIN` без wildcard |
| Редирект-цикл https | Cloudflare в режиме Flexible | переключить на Full (strict) |
| `400 Missing portal` | не доехал `X-Portal-Slug` | [контракт HTTP API](./backend/HTTP_API_CONTRACT.md) |
| Фронт стучится не туда | `NEXT_PUBLIC_*` вшиты в бандл | пересобрать образы, не перезапускать |
| compose собирает образы на сервере | Compose < 2.24, `!reset` не поддержан | обновить Docker |
| API: `502 S3 storage is not configured` | не заданы `AWS_*` | заполнить `api.env`, перезапустить `api` |

Подробный разбор типовых граблей — [HISTORY.md](./HISTORY.md).

---

## Что остаётся за рамками

Рунбук поднимает **один** сервер — этого достаточно до первых боевых клубов. При переходе
на несколько реплик API появятся дубли крон-задач и гонка миграций; разбор и план —
[scaling-roadmap.md](./tasks/scaling-roadmap.md) (TASK-105, TASK-106) и
[DEPLOYMENT.md §8](./DEPLOYMENT.md).
