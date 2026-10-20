import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmFinanceController } from "./api/controllers/crm-finance.controller";
import { CrmFinanceProfileController } from "./api/controllers/crm-finance-profile.controller";
import { FinanceService } from "./application/services/finance.service";
import { OrganizationProfileService } from "./application/services/organization-profile.service";
import { FinancialTransactionRepository } from "./domain/repositories/financial-transaction-repository.interface";
import { OrganizationProfileRepository } from "./domain/repositories/organization-profile-repository.interface";
import { FinancialTransactionPrismaRepository } from "./infrastructure/repositories/financial-transaction-prisma.repository";
import { OrganizationProfilePrismaRepository } from "./infrastructure/repositories/organization-profile-prisma.repository";

/**
 * Финансы — подключаемый модуль портала `finance` (TASK-796…806, documentation/tasks/finance-accounting.md):
 * все маршруты под `CrmAuth({ module: "finance" })`. Профиль организации, налоги, реестр доходов
 * и расходов, отчёты — для клубов (asociación), мастеров и студий (autónomo, SL).
 */
@Module({
    imports: [PrismaModule],
    providers: [
        FinanceService,
        OrganizationProfileService,
        {
            provide: FinancialTransactionRepository,
            useClass: FinancialTransactionPrismaRepository,
        },
        { provide: OrganizationProfileRepository, useClass: OrganizationProfilePrismaRepository },
    ],
    controllers: [CrmFinanceController, CrmFinanceProfileController],
    exports: [FinanceService],
})
export class FinanceModule {}
