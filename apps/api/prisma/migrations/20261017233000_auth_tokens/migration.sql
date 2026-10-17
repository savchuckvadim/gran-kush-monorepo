-- TASK-736: одноразовые ссылки из писем — своя таблица вместо колонок в users. Старые ссылки
-- не переносятся (стадия dev): письмо подтверждения или сброса можно запросить заново.
-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('email_verification', 'password_reset', 'account_setup', 'identity_email_link');

-- DropIndex
DROP INDEX "users_email_verification_token_key";

-- DropIndex
DROP INDEX "users_reset_password_token_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "email_verification_expires_at",
DROP COLUMN "email_verification_token",
DROP COLUMN "reset_password_expires_at",
DROP COLUMN "reset_password_token";

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "user_id" TEXT,
    "email" VARCHAR(255),
    "payload" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "auth_tokens_email_purpose_idx" ON "auth_tokens"("email", "purpose");

-- CreateIndex
CREATE INDEX "auth_tokens_expires_at_idx" ON "auth_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

