-- Place of a card in its kanban column: smaller is higher. The default is minus the creation time
-- in ms, so a new record lands on top of its stage without an extra query.
ALTER TABLE "entity_records" ADD COLUMN     "stage_position" DOUBLE PRECISION NOT NULL DEFAULT (- (EXTRACT(epoch FROM now()) * (1000)::numeric));

-- Existing cards keep today's order (newest first)
UPDATE "entity_records" SET "stage_position" = - (EXTRACT(epoch FROM "created_at") * (1000)::numeric);

-- DropIndex
DROP INDEX "entity_records_stage_id_idx";

-- CreateIndex
CREATE INDEX "entity_records_stage_id_stage_position_idx" ON "entity_records"("stage_id", "stage_position");
