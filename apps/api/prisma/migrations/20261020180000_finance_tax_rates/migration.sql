-- CreateEnum
CREATE TYPE "tax_treatment" AS ENUM ('taxable', 'exempt', 'not_subject');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "net_amount" DECIMAL(10,2),
ADD COLUMN     "tax_amount" DECIMAL(10,2),
ADD COLUMN     "tax_percent" DECIMAL(5,2),
ADD COLUMN     "tax_treatment" "tax_treatment";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "net_total" DECIMAL(10,2),
ADD COLUMN     "tax_total" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "price_includes_tax" BOOLEAN,
ADD COLUMN     "tax_rate_id" TEXT;

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "preset_code" VARCHAR(40),
    "name" VARCHAR(80),
    "percent" DECIMAL(5,2) NOT NULL,
    "treatment" "tax_treatment" NOT NULL DEFAULT 'taxable',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_rates_portal_id_idx" ON "tax_rates"("portal_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_rates_portal_id_preset_code_key" ON "tax_rates"("portal_id", "preset_code");

-- CreateIndex
CREATE INDEX "products_tax_rate_id_idx" ON "products"("tax_rate_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Пресет ставок Испании клубам, где финансы уже включены (TASK-796 включил их по проводкам);
-- остальным ставки создаёт включение модуля. По умолчанию — general, у режима IVA exento — exento.
INSERT INTO "tax_rates" ("id", "portal_id", "preset_code", "percent", "treatment", "is_default", "sort_order", "updated_at")
SELECT gen_random_uuid()::text, m."portal_id", p.code, p.percent, p.treatment::"tax_treatment",
       p.code = CASE WHEN o."vat_regime" = 'exempt' THEN 'es_exempt' ELSE 'es_general' END,
       p.sort_order, CURRENT_TIMESTAMP
FROM "portal_modules" m
CROSS JOIN (VALUES
    ('es_general', 21.00, 'taxable', 10),
    ('es_reduced', 10.00, 'taxable', 20),
    ('es_super_reduced', 4.00, 'taxable', 30),
    ('es_zero', 0.00, 'taxable', 40),
    ('es_exempt', 0.00, 'exempt', 50),
    ('es_not_subject', 0.00, 'not_subject', 60)
) AS p(code, percent, treatment, sort_order)
LEFT JOIN "organization_profiles" o ON o."portal_id" = m."portal_id"
WHERE m."code" = 'finance'
ON CONFLICT ("portal_id", "preset_code") DO NOTHING;
