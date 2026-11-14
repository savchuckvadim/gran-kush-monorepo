-- Роли Postgres одной инсталляции (TASK-820, documentation/tasks/db-security.md).
--
-- Запускается из apply-roles.sh под суперпользователем перед миграциями, на каждом деплое и на
-- каждом `pnpm docker:dev`. Идемпотентен: приводит роли, пароли, владельцев и права к состоянию,
-- описанному здесь, сколько бы раз его ни запускали.
--
--   owner_role (crm_owner) — владелец схемы CRM-базы: миграции Prisma. Не суперпользователь.
--   app_role   (crm_app)   — рантайм API и воркеры: только чтение и запись строк, без DDL,
--                            без BYPASSRLS, с таймаутами и лимитом соединений.
--   site_role  (site_app)  — Payload: владелец только базы сайта, к CRM-базе подключиться не может.
--
-- Суперпользователь из POSTGRES_USER остаётся только для обслуживания и этого скрипта.

\set ON_ERROR_STOP on

-- ── Роли ──

SELECT format('CREATE ROLE %I', r)
FROM unnest(ARRAY[:'owner_role', :'app_role', :'site_role']) AS r
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) \gexec

-- CREATEDB нужен только в dev: `prisma migrate dev` создаёт теневую базу.
SELECT format(
    'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS %s PASSWORD %L',
    :'owner_role',
    CASE WHEN :'owner_createdb' = 'true' THEN 'CREATEDB' ELSE 'NOCREATEDB' END,
    :'owner_password'
) \gexec

SELECT format(
    'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS NOCREATEDB CONNECTION LIMIT %s PASSWORD %L',
    :'app_role', (:'app_connection_limit')::int, :'app_password'
) \gexec

-- Один зависший запрос или забытая транзакция не должны держать базу и блокировки.
SELECT format('ALTER ROLE %I SET statement_timeout = %L', :'app_role', :'app_statement_timeout') \gexec
SELECT format('ALTER ROLE %I SET lock_timeout = %L', :'app_role', :'app_lock_timeout') \gexec
SELECT format(
    'ALTER ROLE %I SET idle_in_transaction_session_timeout = %L',
    :'app_role', :'app_idle_in_transaction_timeout'
) \gexec

SELECT format(
    'ALTER ROLE %I LOGIN NOSUPERUSER NOCREATEROLE NOREPLICATION NOBYPASSRLS NOCREATEDB PASSWORD %L',
    :'site_role', :'site_password'
) \gexec

-- ── Базы ──

SELECT format('ALTER DATABASE %I OWNER TO %I', :'crm_db', :'owner_role') \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'site_db', :'site_role')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'site_db') \gexec
SELECT format('ALTER DATABASE %I OWNER TO %I', :'site_db', :'site_role') \gexec

-- По умолчанию к любой базе может подключиться любая роль: сайт видел бы CRM-базу.
SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', d)
FROM unnest(ARRAY[:'crm_db', :'site_db']) AS d \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'crm_db', :'app_role') \gexec

-- ── CRM-база: владелец объектов и права рантайма ──

\connect :"crm_db"
\set target_owner :owner_role
\ir own-schema.sql

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_role') \gexec
SELECT format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_role'
) \gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_role') \gexec

-- Таблицы, которые создаст следующая миграция, сразу доступны рантайму.
SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    :'owner_role', :'app_role'
) \gexec
SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
    :'owner_role', :'app_role'
) \gexec

-- Журнал миграций рантайму не нужен. На первом деплое таблицы ещё нет — закроется на следующем.
SELECT format('REVOKE ALL ON TABLE public._prisma_migrations FROM %I', :'app_role')
WHERE to_regclass('public._prisma_migrations') IS NOT NULL \gexec

-- ── База сайта: всё принадлежит роли сайта, Payload сам ведёт свои миграции ──

\connect :"site_db"
\set target_owner :site_role
\ir own-schema.sql
