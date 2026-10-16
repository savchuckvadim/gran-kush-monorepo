-- Провайдер входа становится enum, в таблицу добавляются поля профиля под Google и Telegram.
-- Колонка provider приводится типом, а не пересоздаётся: в таблице уже лежат входы через Google.

-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('google', 'telegram');

-- DropIndex (заменяется индексом по (user_id, provider))
DROP INDEX "user_identities_user_id_idx";

-- AlterTable
ALTER TABLE "user_identities"
    ALTER COLUMN "provider" TYPE "IdentityProvider" USING ("provider"::"IdentityProvider"),
    ADD COLUMN "email_verified" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "family_name" VARCHAR(255),
    ADD COLUMN "given_name" VARCHAR(255),
    ADD COLUMN "last_login_at" TIMESTAMP(3),
    ADD COLUMN "locale" VARCHAR(16),
    ADD COLUMN "username" VARCHAR(255);

-- Вход через Google шёл только при email_verified = true, поэтому уже привязанные адреса подтверждены
UPDATE "user_identities" SET "email_verified" = true WHERE "provider" = 'google' AND "email" IS NOT NULL;

-- CreateIndex
CREATE INDEX "user_identities_user_id_provider_idx" ON "user_identities"("user_id", "provider");
