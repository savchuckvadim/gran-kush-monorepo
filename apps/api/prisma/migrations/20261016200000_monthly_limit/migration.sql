-- AlterTable
ALTER TABLE "club_policies" ADD COLUMN     "default_monthly_limit_grams" DECIMAL(10,3),
ADD COLUMN     "monthly_limit_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "members" ADD COLUMN     "monthly_limit_grams" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "limit_grams" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "limit_grams_per_unit" DECIMAL(10,3);

