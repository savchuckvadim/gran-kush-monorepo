-- QR v2 (TASK-714): the code is no longer stored. The server signs id:issued_at, so a reissue
-- (new issued_at) voids the previous code and a database leak alone yields no working code.
-- Existing rows get issued_at = now: their old 400-character codes stop working, the member
-- cabinet shows the new short code on the next open.

-- DropIndex
DROP INDEX "qr_codes_encrypted_code_idx";

-- AlterTable
ALTER TABLE "qr_codes" DROP COLUMN "encrypted_code",
ADD COLUMN     "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
