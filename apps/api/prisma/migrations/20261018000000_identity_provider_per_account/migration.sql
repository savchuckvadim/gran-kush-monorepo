-- TASK-737: у аккаунта один способ входа каждого провайдера (один Google, один Telegram).
-- Повторы сначала убираются: остаётся самая ранняя привязка.
DELETE FROM "user_identities" a
USING "user_identities" b
WHERE a."user_id" = b."user_id" AND a."provider" = b."provider" AND a."created_at" > b."created_at";

-- DropIndex
DROP INDEX "user_identities_user_id_provider_idx";

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_user_id_provider_key" ON "user_identities"("user_id", "provider");
