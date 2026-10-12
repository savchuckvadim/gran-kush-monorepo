-- CreateEnum
CREATE TYPE "MemberConsentStatus" AS ENUM ('confirmed', 'pending');

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "consent_confirmed_at" TIMESTAMP(3),
ADD COLUMN     "consent_requested_at" TIMESTAMP(3),
ADD COLUMN     "consent_status" "MemberConsentStatus" NOT NULL DEFAULT 'confirmed',
ADD COLUMN     "consent_token" VARCHAR(128),
ADD COLUMN     "signature_shared" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "member_document_shares" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "user_document_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_document_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_document_shares_user_document_id_idx" ON "member_document_shares"("user_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_document_shares_member_id_user_document_id_key" ON "member_document_shares"("member_id", "user_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_consent_token_key" ON "members"("consent_token");

-- AddForeignKey
ALTER TABLE "member_document_shares" ADD CONSTRAINT "member_document_shares_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_document_shares" ADD CONSTRAINT "member_document_shares_user_document_id_fkey" FOREIGN KEY ("user_document_id") REFERENCES "user_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill (TASK-663): every membership that exists today was created before consent existed,
-- so it keeps what its club could already see — all documents and the signature of the account.
INSERT INTO "member_document_shares" ("id", "member_id", "user_document_id", "created_at")
SELECT gen_random_uuid()::text, m."id", d."id", CURRENT_TIMESTAMP
FROM "members" m
JOIN "user_documents" d ON d."user_id" = m."user_id";

UPDATE "members" m
SET "signature_shared" = true
WHERE EXISTS (SELECT 1 FROM "user_signatures" s WHERE s."user_id" = m."user_id");
