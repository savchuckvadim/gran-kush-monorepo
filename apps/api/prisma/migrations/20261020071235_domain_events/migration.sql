-- Outbox доменных событий (TASK-780). Частичный уникальный индекс ui_settings_portal_key_shared_key
-- (миграция 20261015170000_ui_settings) Prisma не описывает и предлагает удалить — его не трогаем.

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    "portal_id" TEXT,
    "name" VARCHAR(80) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_kind" VARCHAR(40) NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "actor_kind" VARCHAR(20) NOT NULL,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "dispatched_at" TIMESTAMP(3),

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_event_deliveries" (
    "event_id" TEXT NOT NULL,
    "consumer" VARCHAR(120) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "delivered_at" TIMESTAMP(3),
    "last_error" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_event_deliveries_pkey" PRIMARY KEY ("event_id","consumer")
);

-- CreateIndex
CREATE UNIQUE INDEX "domain_events_sequence_key" ON "domain_events"("sequence");

-- CreateIndex
CREATE INDEX "domain_events_dispatched_at_sequence_idx" ON "domain_events"("dispatched_at", "sequence");

-- CreateIndex
CREATE INDEX "domain_events_portal_id_occurred_at_idx" ON "domain_events"("portal_id", "occurred_at");

-- CreateIndex
CREATE INDEX "domain_events_aggregate_kind_aggregate_id_idx" ON "domain_events"("aggregate_kind", "aggregate_id");

-- CreateIndex
CREATE INDEX "domain_event_deliveries_delivered_at_idx" ON "domain_event_deliveries"("delivered_at");

-- AddForeignKey
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_event_deliveries" ADD CONSTRAINT "domain_event_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "domain_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
