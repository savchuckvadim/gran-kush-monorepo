-- TASK-733: сессии вместо refresh-токенов. Старые refresh-токены не переносятся: после деплоя
-- все входят заново (решение 2026-10-17 — стадия dev, обратная совместимость не нужна).

-- CreateEnum
CREATE TYPE "SessionAudience" AS ENUM ('crm', 'cabinet');

-- CreateEnum
CREATE TYPE "SignInMethod" AS ENUM ('password', 'google', 'telegram', 'email_link', 'invitation', 'registration');

-- CreateEnum
CREATE TYPE "SessionRevokeReason" AS ENUM ('logout', 'sign_out_everywhere', 'revoked_by_user', 'password_changed', 'password_reset', 'account_claimed', 'reuse_detected', 'blocked');

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_platform_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";


-- DropTable
DROP TABLE "refresh_tokens";

-- DropEnum
DROP TYPE "PrincipalType";

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audience" "SessionAudience" NOT NULL,
    "device_id" VARCHAR(128) NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "previous_token_hash" VARCHAR(64),
    "rotated_at" TIMESTAMP(3),
    "sign_in_method" "SignInMethod" NOT NULL,
    "user_agent" VARCHAR(512),
    "ip_address" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" "SessionRevokeReason",

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_user_id_audience_device_id_key" ON "auth_sessions"("user_id", "audience", "device_id");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

