-- AlterTable
ALTER TABLE "portals" ADD COLUMN     "terms_accepted_at" TIMESTAMP(3),
ADD COLUMN     "terms_accepted_by_user_id" TEXT,
ADD COLUMN     "terms_version" VARCHAR(32);

-- AddForeignKey
ALTER TABLE "portals" ADD CONSTRAINT "portals_terms_accepted_by_user_id_fkey" FOREIGN KEY ("terms_accepted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
