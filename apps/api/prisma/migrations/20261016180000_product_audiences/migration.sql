-- CreateEnum
CREATE TYPE "ProductAudience" AS ENUM ('medical', 'mj', 'recreation');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "audiences" "ProductAudience"[] DEFAULT ARRAY[]::"ProductAudience"[];

