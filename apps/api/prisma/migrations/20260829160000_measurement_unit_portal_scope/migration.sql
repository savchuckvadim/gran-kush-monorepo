-- Единицы измерения становятся портальными.
--
-- Было: общая таблица без portal_id и `code` уникальный глобально. Два следствия —
-- админ клуба A правил и удалял единицы, на которые ссылаются товары клуба B, а клуб B
-- не мог завести код, уже занятый клубом A.
--
-- Владельца существующих строк вывести неоткуда: справочник ничем не сидится, а часть
-- единиц может быть вообще не использована товарами. Поэтому миграция не гадает и ничего
-- не теряет — каждый портал получает собственную копию всего справочника, а товары
-- переводятся на копию своего портала.

-- AlterTable
ALTER TABLE "measurement_units" ADD COLUMN "portal_id" TEXT;

DO $$
DECLARE
    other_portal RECORD;
    first_portal TEXT;
BEGIN
    SELECT id INTO first_portal FROM "portals" ORDER BY "created_at", id LIMIT 1;

    IF first_portal IS NULL THEN
        -- Порталов нет — принадлежать единицам некому и товаров на них тоже нет.
        DELETE FROM "measurement_units";
        RETURN;
    END IF;

    -- Исходные строки достаются первому порталу.
    UPDATE "measurement_units" SET "portal_id" = first_portal WHERE "portal_id" IS NULL;

    -- Остальным — копии. Конфликтов по (portal_id, code) не будет: code был уникален глобально.
    FOR other_portal IN SELECT id FROM "portals" WHERE id <> first_portal LOOP
        INSERT INTO "measurement_units" (
            id, code, name, description, is_custom, is_active, created_at, updated_at, portal_id
        )
        SELECT
            gen_random_uuid()::text, code, name, description, is_custom, is_active,
            created_at, updated_at, other_portal.id
        FROM "measurement_units"
        WHERE "portal_id" = first_portal;
    END LOOP;

    -- Товары — на копию своего портала.
    UPDATE "products" p
    SET "measurement_unit_id" = mine.id
    FROM "measurement_units" old, "measurement_units" mine
    WHERE p."measurement_unit_id" = old.id
      AND mine.code = old.code
      AND mine."portal_id" = p."portal_id"
      AND mine.id <> old.id;
END $$;

ALTER TABLE "measurement_units" ALTER COLUMN "portal_id" SET NOT NULL;

-- DropIndex
DROP INDEX "measurement_units_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_portal_id_code_key" ON "measurement_units"("portal_id", "code");

-- CreateIndex
CREATE INDEX "measurement_units_portal_id_idx" ON "measurement_units"("portal_id");

-- AddForeignKey
ALTER TABLE "measurement_units" ADD CONSTRAINT "measurement_units_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
