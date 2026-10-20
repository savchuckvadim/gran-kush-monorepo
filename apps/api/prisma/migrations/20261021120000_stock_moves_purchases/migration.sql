-- CreateEnum
CREATE TYPE "stock_move_reason" AS ENUM ('purchase', 'order_placed', 'order_cancelled', 'write_off', 'recount', 'gift', 'initial');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "unit_cost" DECIMAL(10,4);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "average_cost" DECIMAL(10,4);

-- CreateTable
CREATE TABLE "stock_moves" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "reason" "stock_move_reason" NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_cost" DECIMAL(10,4) NOT NULL,
    "balance_after" DECIMAL(10,3) NOT NULL,
    "order_id" TEXT,
    "purchase_id" TEXT,
    "note" VARCHAR(500),
    "employee_id" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "portal_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_cost" DECIMAL(10,4) NOT NULL,
    "ledger_entry_id" TEXT,
    "counterparty_id" TEXT,
    "received_on" DATE NOT NULL,
    "employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_moves_portal_id_product_id_occurred_at_idx" ON "stock_moves"("portal_id", "product_id", "occurred_at");

-- CreateIndex
CREATE INDEX "stock_moves_portal_id_occurred_at_idx" ON "stock_moves"("portal_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_ledger_entry_id_key" ON "purchases"("ledger_entry_id");

-- CreateIndex
CREATE INDEX "purchases_portal_id_received_on_idx" ON "purchases"("portal_id", "received_on");

-- CreateIndex
CREATE INDEX "purchases_portal_id_product_id_idx" ON "purchases"("portal_id", "product_id");

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_moves" ADD CONSTRAINT "stock_moves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_ledger_entry_id_fkey" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

