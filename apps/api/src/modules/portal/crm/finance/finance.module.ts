import { Module } from "@nestjs/common";

import { StorageModule } from "@storage/storage.module";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmCounterpartiesController } from "./api/controllers/crm-counterparties.controller";
import { CrmFinanceCategoriesController } from "./api/controllers/crm-finance-categories.controller";
import { CrmFinancePeriodsController } from "./api/controllers/crm-finance-periods.controller";
import { CrmFinanceProfileController } from "./api/controllers/crm-finance-profile.controller";
import { CrmLedgerController } from "./api/controllers/crm-ledger.controller";
import { CrmLedgerAttachmentsController } from "./api/controllers/crm-ledger-attachments.controller";
import { CrmLedgerFilesController } from "./api/controllers/crm-ledger-files.controller";
import { CrmTaxRatesController } from "./api/controllers/crm-tax-rates.controller";
import { FinanceModuleLifecycle } from "./application/finance-module.lifecycle";
import { LegacyLedgerMigration } from "./application/legacy-ledger.migration";
import { OrderLedgerConsumer } from "./application/order-ledger.consumer";
import { CounterpartiesService } from "./application/services/counterparties.service";
import { FinanceCategoriesService } from "./application/services/finance-categories.service";
import { FinanceOverviewService } from "./application/services/finance-overview.service";
import { FinancePeriodsService } from "./application/services/finance-periods.service";
import { LedgerAttachmentsService } from "./application/services/ledger-attachments.service";
import { LedgerEntriesService } from "./application/services/ledger-entries.service";
import { LedgerEntryInputService } from "./application/services/ledger-entry-input.service";
import { LedgerTemplateService } from "./application/services/ledger-template.service";
import { OrganizationProfileService } from "./application/services/organization-profile.service";
import { PurchaseLedgerService } from "./application/services/purchase-ledger.service";
import { TaxPolicyService } from "./application/services/tax-policy.service";
import { TaxRatesService } from "./application/services/tax-rates.service";
import { CancelEntryUseCase } from "./application/use-cases/cancel-entry.use-case";
import { CorrectEntryUseCase } from "./application/use-cases/correct-entry.use-case";
import { ExportLedgerUseCase } from "./application/use-cases/export-ledger.use-case";
import { ImportLedgerUseCase } from "./application/use-cases/import-ledger.use-case";
import { ReclassifyEntryUseCase } from "./application/use-cases/reclassify-entry.use-case";
import { ReconcileOrderSaleUseCase } from "./application/use-cases/reconcile-order-sale.use-case";
import { RecordEntryUseCase } from "./application/use-cases/record-entry.use-case";
import { CounterpartyRepository } from "./domain/repositories/counterparty-repository.interface";
import { FinanceCategoryRepository } from "./domain/repositories/finance-category-repository.interface";
import { FinancePeriodRepository } from "./domain/repositories/finance-period-repository.interface";
import {
    FinanceAttachmentStore,
    FinanceAuditLog,
    FinanceDirectory,
    LegacyTransactionSource,
    OrderSaleSource,
} from "./domain/repositories/finance-sources.interface";
import { LedgerRepository } from "./domain/repositories/ledger-repository.interface";
import { LedgerSpreadsheet } from "./domain/repositories/ledger-spreadsheet.interface";
import { OrganizationProfileRepository } from "./domain/repositories/organization-profile-repository.interface";
import { TaxRateRepository } from "./domain/repositories/tax-rate-repository.interface";
import { LedgerCodec } from "./infrastructure/ledger/ledger-codec";
import { LedgerLookup } from "./infrastructure/ledger/ledger-lookup";
import { LedgerPrismaRepository } from "./infrastructure/ledger/ledger-prisma.repository";
import { LegacyTransactionPrismaSource } from "./infrastructure/legacy/legacy-transaction-prisma.source";
import { CounterpartyPrismaRepository } from "./infrastructure/repositories/counterparty-prisma.repository";
import { FinanceCategoryPrismaRepository } from "./infrastructure/repositories/finance-category-prisma.repository";
import { FinancePeriodPrismaRepository } from "./infrastructure/repositories/finance-period-prisma.repository";
import { OrganizationProfilePrismaRepository } from "./infrastructure/repositories/organization-profile-prisma.repository";
import { TaxRatePrismaRepository } from "./infrastructure/repositories/tax-rate-prisma.repository";
import { FinanceAttachmentS3Store } from "./infrastructure/sources/finance-attachment-s3.store";
import { FinanceAuditPrismaLog } from "./infrastructure/sources/finance-audit-prisma.log";
import { FinanceDirectoryPrisma } from "./infrastructure/sources/finance-directory-prisma";
import { OrderSalePrismaSource } from "./infrastructure/sources/order-sale-prisma.source";
import { ExcelJsSpreadsheet } from "./infrastructure/spreadsheet/exceljs-spreadsheet";

/**
 * Финансы — подключаемый модуль портала `finance` (TASK-796…806, documentation/tasks/finance-accounting.md):
 * все маршруты под `CrmAuth({ module: "finance" })`. Профиль организации, налоги, реестр доходов и
 * расходов с импортом и выгрузкой таблицей, месяцы учёта — для клубов (asociación), мастеров и
 * студий (autónomo, SL). Суммы и контрагенты хранятся шифром ключа портала.
 *
 * Наружу: `TaxPolicyService` — как облагается товар (заказы, витрина), `TaxRatesService` — проверка
 * ставки товара. От заказов финансы не зависят: оплаты они слушают событиями (`OrderLedgerConsumer`).
 */
@Module({
    imports: [PrismaModule, StorageModule],
    providers: [
        OrganizationProfileService,
        TaxRatesService,
        TaxPolicyService,
        FinanceModuleLifecycle,
        FinanceCategoriesService,
        CounterpartiesService,
        LedgerEntriesService,
        LedgerEntryInputService,
        LedgerAttachmentsService,
        LedgerTemplateService,
        FinancePeriodsService,
        FinanceOverviewService,
        PurchaseLedgerService,
        RecordEntryUseCase,
        CorrectEntryUseCase,
        ReclassifyEntryUseCase,
        CancelEntryUseCase,
        ReconcileOrderSaleUseCase,
        ImportLedgerUseCase,
        ExportLedgerUseCase,
        OrderLedgerConsumer,
        LegacyLedgerMigration,
        LedgerCodec,
        LedgerLookup,
        { provide: OrganizationProfileRepository, useClass: OrganizationProfilePrismaRepository },
        { provide: TaxRateRepository, useClass: TaxRatePrismaRepository },
        { provide: LedgerRepository, useClass: LedgerPrismaRepository },
        { provide: FinanceCategoryRepository, useClass: FinanceCategoryPrismaRepository },
        { provide: CounterpartyRepository, useClass: CounterpartyPrismaRepository },
        { provide: FinancePeriodRepository, useClass: FinancePeriodPrismaRepository },
        { provide: OrderSaleSource, useClass: OrderSalePrismaSource },
        { provide: FinanceDirectory, useClass: FinanceDirectoryPrisma },
        { provide: FinanceAttachmentStore, useClass: FinanceAttachmentS3Store },
        { provide: FinanceAuditLog, useClass: FinanceAuditPrismaLog },
        { provide: LegacyTransactionSource, useClass: LegacyTransactionPrismaSource },
        { provide: LedgerSpreadsheet, useClass: ExcelJsSpreadsheet },
    ],
    controllers: [
        CrmFinanceProfileController,
        CrmTaxRatesController,
        CrmLedgerController,
        CrmLedgerAttachmentsController,
        CrmLedgerFilesController,
        CrmFinanceCategoriesController,
        CrmCounterpartiesController,
        CrmFinancePeriodsController,
    ],
    exports: [
        TaxPolicyService,
        TaxRatesService,
        PurchaseLedgerService,
        CounterpartiesService,
        FinanceDirectory,
    ],
})
export class FinanceModule {}
