-- CreateEnum
CREATE TYPE "ledger_direction" AS ENUM ('income', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "ledger_entry_status" AS ENUM ('posted', 'void');

-- CreateEnum
CREATE TYPE "finance_account" AS ENUM ('cash', 'bank', 'card');

-- CreateEnum
CREATE TYPE "ledger_document_type" AS ENUM ('invoice_received', 'invoice_issued', 'receipt', 'none');

-- CreateEnum
CREATE TYPE "counterparty_kind" AS ENUM ('supplier', 'customer', 'member', 'employee', 'authority');

-- CreateTable
CREATE TABLE "finance_categories" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80),
    "direction" "ledger_direction" NOT NULL,
    "pgc_account" VARCHAR(10),
    "tax_treatment" "tax_treatment",
    "is_preset" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparties" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "kind" "counterparty_kind" NOT NULL,
    "member_id" TEXT,
    "details" TEXT,
    "nif_index" VARCHAR(64),
    "name_index" VARCHAR(64),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counterparties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "direction" "ledger_direction" NOT NULL,
    "status" "ledger_entry_status" NOT NULL DEFAULT 'posted',
    "occurred_on" DATE NOT NULL,
    "category_id" TEXT,
    "counterparty_id" TEXT,
    "account" "finance_account" NOT NULL,
    "to_account" "finance_account",
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "document_type" "ledger_document_type" NOT NULL DEFAULT 'none',
    "document_index" VARCHAR(64),
    "payload" TEXT NOT NULL,
    "attachment_path" VARCHAR(255),
    "source_type" VARCHAR(20) NOT NULL,
    "source_id" VARCHAR(255),
    "reversal_of_id" TEXT,
    "created_by_id" TEXT,
    "voided_at" TIMESTAMP(3),
    "voided_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_periods" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_categories_portal_id_direction_idx" ON "finance_categories"("portal_id", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "finance_categories_portal_id_code_key" ON "finance_categories"("portal_id", "code");

-- CreateIndex
CREATE INDEX "counterparties_portal_id_name_index_idx" ON "counterparties"("portal_id", "name_index");

-- CreateIndex
CREATE UNIQUE INDEX "counterparties_portal_id_member_id_key" ON "counterparties"("portal_id", "member_id");

-- CreateIndex
CREATE UNIQUE INDEX "counterparties_portal_id_nif_index_key" ON "counterparties"("portal_id", "nif_index");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_reversal_of_id_key" ON "ledger_entries"("reversal_of_id");

-- CreateIndex
CREATE INDEX "ledger_entries_portal_id_occurred_on_idx" ON "ledger_entries"("portal_id", "occurred_on");

-- CreateIndex
CREATE INDEX "ledger_entries_portal_id_category_id_idx" ON "ledger_entries"("portal_id", "category_id");

-- CreateIndex
CREATE INDEX "ledger_entries_portal_id_counterparty_id_idx" ON "ledger_entries"("portal_id", "counterparty_id");

-- CreateIndex
CREATE INDEX "ledger_entries_portal_id_document_index_idx" ON "ledger_entries"("portal_id", "document_index");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_portal_id_source_type_source_id_key" ON "ledger_entries"("portal_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_periods_portal_id_year_month_key" ON "finance_periods"("portal_id", "year", "month");

-- AddForeignKey
ALTER TABLE "finance_categories" ADD CONSTRAINT "finance_categories_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counterparties" ADD CONSTRAINT "counterparties_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "ledger_entries"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_periods" ADD CONSTRAINT "finance_periods_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_periods" ADD CONSTRAINT "finance_periods_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

