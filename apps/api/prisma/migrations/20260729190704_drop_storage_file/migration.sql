/*
  Warnings:

  - You are about to drop the `storage_files` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "storage_files" DROP CONSTRAINT "storage_files_portal_id_fkey";

-- DropForeignKey
ALTER TABLE "storage_files" DROP CONSTRAINT "storage_files_user_id_fkey";

-- DropTable
DROP TABLE "storage_files";
