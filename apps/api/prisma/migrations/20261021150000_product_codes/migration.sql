-- AlterTable
ALTER TABLE "products" ADD COLUMN     "barcode" VARCHAR(64),
ADD COLUMN     "code" VARCHAR(16),
ADD COLUMN     "is_consumable" BOOLEAN NOT NULL DEFAULT false;

-- Коды этикеток уже заведённым товарам (TASK-807): 8 знаков того же алфавита, что у
-- newProductCode. Подзапрос ссылается на строку, поэтому код свой у каждой; совпавший внутри
-- клуба код выпадает заново, пока все коды клуба не станут разными.
DO $$
DECLARE
    alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
BEGIN
    LOOP
        UPDATE "products" AS p
        SET "code" = (
            SELECT string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
            FROM generate_series(1, 8)
            WHERE p."id" IS NOT NULL
        )
        WHERE p."code" IS NULL
           OR EXISTS (
                SELECT 1 FROM "products" AS o
                WHERE o."portal_id" = p."portal_id" AND o."code" = p."code" AND o."id" < p."id"
           );
        EXIT WHEN NOT FOUND;
    END LOOP;
END $$;

ALTER TABLE "products" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "products_portal_id_code_key" ON "products"("portal_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_portal_id_barcode_key" ON "products"("portal_id", "barcode");
