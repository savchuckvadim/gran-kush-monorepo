-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "source_id" VARCHAR(255),
ADD COLUMN     "source_type" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_source_type_source_id_key" ON "financial_transactions"("source_type", "source_id");
