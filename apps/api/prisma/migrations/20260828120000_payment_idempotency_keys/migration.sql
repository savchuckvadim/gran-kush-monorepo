-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "event_id" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_events_processed_at_idx" ON "payment_events"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_event_id_key" ON "payment_events"("provider", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_external_id_key" ON "payments"("provider", "external_id");
