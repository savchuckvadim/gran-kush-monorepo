-- Версии документов аккаунта и журнал обращений к ним (TASK-704).
-- Номер документа теперь хранится зашифрованным и длиннее: ширина колонки увеличена,
-- существующие значения шифруются при старте API (document-number-backfill).

-- CreateEnum
CREATE TYPE "DocumentAccessAction" AS ENUM ('view', 'upload', 'replace', 'share', 'revoke', 'delete');

-- CreateEnum
CREATE TYPE "DocumentAccessActor" AS ENUM ('owner', 'club', 'system');

-- DropIndex
DROP INDEX "user_documents_user_id_type_side_key";

-- AlterTable
ALTER TABLE "user_documents" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "number" SET DATA TYPE VARCHAR(400);

-- CreateTable
CREATE TABLE "document_access_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" VARCHAR(20) NOT NULL,
    "document_id" TEXT,
    "member_id" TEXT,
    "portal_id" TEXT,
    "actor_type" "DocumentAccessActor" NOT NULL,
    "actor_id" TEXT,
    "action" "DocumentAccessAction" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_access_logs_user_id_created_at_idx" ON "document_access_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "document_access_logs_document_id_idx" ON "document_access_logs"("document_id");

-- CreateIndex
CREATE INDEX "document_access_logs_portal_id_created_at_idx" ON "document_access_logs"("portal_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_documents_user_id_type_side_version_key" ON "user_documents"("user_id", "type", "side", "version");

-- AddForeignKey
ALTER TABLE "document_access_logs" ADD CONSTRAINT "document_access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
