-- AlterEnum
ALTER TYPE "RegistrationLinkKind" ADD VALUE 'personal';

-- AlterTable
ALTER TABLE "registration_links" ADD COLUMN     "prefill_json" JSONB,
ADD COLUMN     "revoked_at" TIMESTAMP(3);
