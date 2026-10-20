-- CreateTable
CREATE TABLE "entity_comments" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "subject_kind" VARCHAR(32) NOT NULL,
    "subject_id" TEXT NOT NULL,
    "author_employee_id" TEXT,
    "body" TEXT NOT NULL,
    "pinned_at" TIMESTAMP(3),
    "pinned_by_employee_id" TEXT,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entity_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entity_comments_portal_id_subject_kind_subject_id_created_a_idx" ON "entity_comments"("portal_id", "subject_kind", "subject_id", "created_at");

-- CreateIndex
CREATE INDEX "entity_comments_portal_id_created_at_idx" ON "entity_comments"("portal_id", "created_at");

-- AddForeignKey
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_author_employee_id_fkey" FOREIGN KEY ("author_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_comments" ADD CONSTRAINT "entity_comments_pinned_by_employee_id_fkey" FOREIGN KEY ("pinned_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
