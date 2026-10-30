-- Background operations (TASK-809): a request answers 202 with an id, the work runs in the `operations` queue
-- CreateEnum
CREATE TYPE "operation_status" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "kind" VARCHAR(80) NOT NULL,
    "status" "operation_status" NOT NULL DEFAULT 'queued',
    "requested_by_employee_id" TEXT NOT NULL,
    "idempotency_key" VARCHAR(255),
    "input_hash" CHAR(64) NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "operations_portal_id_requested_by_employee_id_created_at_idx" ON "operations"("portal_id", "requested_by_employee_id", "created_at");

-- CreateIndex
CREATE INDEX "operations_status_created_at_idx" ON "operations"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "operations_portal_id_requested_by_employee_id_kind_idempote_key" ON "operations"("portal_id", "requested_by_employee_id", "kind", "idempotency_key");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_requested_by_employee_id_fkey" FOREIGN KEY ("requested_by_employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
