#!/bin/sh
# Приводит роли и права Postgres к roles.sql (TASK-820). Подключается под суперпользователем
# через стандартные PGHOST / PGPORT / PGUSER / PGPASSWORD; базы и пароли ролей — из env ниже.
#
#   Dokploy:  сервис <бренд>-db-setup перед API и сайтом (образ API, psql внутри)
#   dev:      сервис db-roles в infra/compose/docker-compose.dev.yml
#   CI:       шаг перед миграциями в .github/workflows/ci.yml
set -eu

: "${CRM_DB:?CRM_DB: the API database}"
: "${SITE_DB:=site}"
: "${DB_OWNER_PASSWORD:?DB_OWNER_PASSWORD: password of the migrations role}"
: "${DB_APP_PASSWORD:?DB_APP_PASSWORD: password of the API runtime role}"
: "${DB_SITE_PASSWORD:?DB_SITE_PASSWORD: password of the site role}"

# Имена ролей входят в DATABASE_URL сервисов — менять вместе с compose.
: "${DB_OWNER_ROLE:=crm_owner}"
: "${DB_APP_ROLE:=crm_app}"
: "${DB_SITE_ROLE:=site_app}"
: "${DB_OWNER_CREATEDB:=false}"

# Пул PrismaPg — 10 соединений на процесс; запас на второй процесс при перезапуске и сид.
: "${DB_APP_CONNECTION_LIMIT:=30}"
: "${DB_APP_STATEMENT_TIMEOUT:=30s}"
: "${DB_APP_LOCK_TIMEOUT:=10s}"
: "${DB_APP_IDLE_IN_TRANSACTION_TIMEOUT:=60s}"

here=$(cd "$(dirname "$0")" && pwd)

# Подключаемся к CRM-базе: она есть всегда (POSTGRES_DB), в отличие от базы сайта.
psql --no-psqlrc --quiet --dbname="$CRM_DB" \
    -v ON_ERROR_STOP=1 \
    -v crm_db="$CRM_DB" \
    -v site_db="$SITE_DB" \
    -v owner_role="$DB_OWNER_ROLE" \
    -v app_role="$DB_APP_ROLE" \
    -v site_role="$DB_SITE_ROLE" \
    -v owner_password="$DB_OWNER_PASSWORD" \
    -v app_password="$DB_APP_PASSWORD" \
    -v site_password="$DB_SITE_PASSWORD" \
    -v owner_createdb="$DB_OWNER_CREATEDB" \
    -v app_connection_limit="$DB_APP_CONNECTION_LIMIT" \
    -v app_statement_timeout="$DB_APP_STATEMENT_TIMEOUT" \
    -v app_lock_timeout="$DB_APP_LOCK_TIMEOUT" \
    -v app_idle_in_transaction_timeout="$DB_APP_IDLE_IN_TRANSACTION_TIMEOUT" \
    -f "$here/roles.sql"

echo "[db-roles] roles $DB_OWNER_ROLE, $DB_APP_ROLE, $DB_SITE_ROLE are up to date"
