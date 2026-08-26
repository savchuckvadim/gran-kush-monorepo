-- TASK-109: не больше одной открытой сессии присутствия на участника.
--
-- Прямое выражение правила — частичный уникальный индекс:
--   CREATE UNIQUE INDEX ... ON presence_sessions (entity_record_id) WHERE exited_at IS NULL;
-- но Prisma не умеет WHERE в схеме, а индекс, добавленный сырым SQL, начиная с 7.4.0
-- сносится следующим же `prisma migrate dev` (prisma/prisma#29220 — открыт).
-- Поэтому используем nullable-колонку с UNIQUE: в Postgres NULL не конфликтует с NULL,
-- поэтому закрытых сессий может быть сколько угодно, а открытая — ровно одна.

-- 1. Закрыть уже существующие дубли, оставив самую свежую открытую сессию участника.
--    До этой миграции гонка двух сканов QR могла открыть вторую сессию: обе транзакции
--    видели «активной нет» и обе делали INSERT.
UPDATE "presence_sessions" AS ps
SET "exited_at"   = NOW(),
    "exit_method" = 'auto_cron'
WHERE ps."exited_at" IS NULL
  AND EXISTS (
      SELECT 1
      FROM "presence_sessions" AS newer
      WHERE newer."entity_record_id" = ps."entity_record_id"
        AND newer."exited_at" IS NULL
        AND (newer."entered_at", newer."id") > (ps."entered_at", ps."id")
  );

-- 2. Колонка-маркер открытой сессии.
ALTER TABLE "presence_sessions" ADD COLUMN "active_entity_record_id" TEXT;

-- 3. Backfill: у открытых сессий маркер равен entity_record_id, у закрытых остаётся NULL.
UPDATE "presence_sessions"
SET "active_entity_record_id" = "entity_record_id"
WHERE "exited_at" IS NULL;

-- 4. Собственно гарантия.
CREATE UNIQUE INDEX "presence_sessions_active_entity_record_id_key"
    ON "presence_sessions"("active_entity_record_id");
