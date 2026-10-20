-- Модули портала, ключи данных портала и профиль организации (TASK-796).
-- Частичный уникальный индекс ui_settings_portal_key_shared_key Prisma не описывает и предлагает
-- удалить: его не трогаем.

-- CreateEnum
CREATE TYPE "LegalForm" AS ENUM ('association', 'self_employed', 'limited_company', 'other');

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('general', 'exempt', 'equivalence_surcharge');

-- CreateEnum
CREATE TYPE "IncomeTaxRegime" AS ENUM ('corporate_partially_exempt', 'corporate', 'irpf_direct_simplified', 'irpf_direct_normal', 'irpf_objective');

-- CreateTable
CREATE TABLE "portal_modules" (
    "portal_id" TEXT NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled_by_employee_id" TEXT,

    CONSTRAINT "portal_modules_pkey" PRIMARY KEY ("portal_id","code")
);

-- CreateTable
CREATE TABLE "portal_data_keys" (
    "portal_id" TEXT NOT NULL,
    "purpose" VARCHAR(40) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "wrapped_key" TEXT NOT NULL,
    "kek_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_data_keys_pkey" PRIMARY KEY ("portal_id","purpose","version")
);

-- CreateTable
CREATE TABLE "organization_profiles" (
    "portal_id" TEXT NOT NULL,
    "legal_form" "LegalForm" NOT NULL,
    "country" VARCHAR(2) NOT NULL DEFAULT 'ES',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "vat_regime" "VatRegime" NOT NULL,
    "income_tax_regime" "IncomeTaxRegime" NOT NULL,
    "prices_include_tax" BOOLEAN NOT NULL DEFAULT true,
    "fiscal_year_start_month" INTEGER NOT NULL DEFAULT 1,
    "identity" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_employee_id" TEXT,

    CONSTRAINT "organization_profiles_pkey" PRIMARY KEY ("portal_id")
);

-- AddForeignKey
ALTER TABLE "portal_modules" ADD CONSTRAINT "portal_modules_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_data_keys" ADD CONSTRAINT "portal_data_keys_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_portal_id_fkey" FOREIGN KEY ("portal_id") REFERENCES "portals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Порталы, где финансами уже пользовались, получают модуль включённым: раздел не пропадёт.
INSERT INTO "portal_modules" ("portal_id", "code")
SELECT DISTINCT "portal_id", 'finance' FROM "financial_transactions"
ON CONFLICT DO NOTHING;
