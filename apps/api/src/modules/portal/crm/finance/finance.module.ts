import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmFinanceController } from "./api/controllers/crm-finance.controller";
import { CrmFinanceProfileController } from "./api/controllers/crm-finance-profile.controller";
import { CrmTaxRatesController } from "./api/controllers/crm-tax-rates.controller";
import { FinanceModuleLifecycle } from "./application/finance-module.lifecycle";
import { FinanceService } from "./application/services/finance.service";
import { OrganizationProfileService } from "./application/services/organization-profile.service";
import { TaxPolicyService } from "./application/services/tax-policy.service";
import { TaxRatesService } from "./application/services/tax-rates.service";
import { FinancialTransactionRepository } from "./domain/repositories/financial-transaction-repository.interface";
import { OrganizationProfileRepository } from "./domain/repositories/organization-profile-repository.interface";
import { TaxRateRepository } from "./domain/repositories/tax-rate-repository.interface";
import { FinancialTransactionPrismaRepository } from "./infrastructure/repositories/financial-transaction-prisma.repository";
import { OrganizationProfilePrismaRepository } from "./infrastructure/repositories/organization-profile-prisma.repository";
import { TaxRatePrismaRepository } from "./infrastructure/repositories/tax-rate-prisma.repository";

/**
 * Финансы — подключаемый модуль портала `finance` (TASK-796…806, documentation/tasks/finance-accounting.md):
 * все маршруты под `CrmAuth({ module: "finance" })`. Профиль организации, налоги, реестр доходов
 * и расходов, отчёты — для клубов (asociación), мастеров и студий (autónomo, SL).
 *
 * Наружу: `TaxPolicyService` — как облагается товар (заказы, витрина), `TaxRatesService` — проверка
 * ставки товара. Финансы сами не зависят от заказов и каталога: заказы они слушают событиями.
 */
@Module({
    imports: [PrismaModule],
    providers: [
        FinanceService,
        OrganizationProfileService,
        TaxRatesService,
        TaxPolicyService,
        FinanceModuleLifecycle,
        {
            provide: FinancialTransactionRepository,
            useClass: FinancialTransactionPrismaRepository,
        },
        { provide: OrganizationProfileRepository, useClass: OrganizationProfilePrismaRepository },
        { provide: TaxRateRepository, useClass: TaxRatePrismaRepository },
    ],
    controllers: [CrmFinanceController, CrmFinanceProfileController, CrmTaxRatesController],
    exports: [FinanceService, TaxPolicyService, TaxRatesService],
})
export class FinanceModule {}
