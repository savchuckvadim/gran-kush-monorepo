import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmFinanceController } from "./api/controllers/crm-finance.controller";
import { FinanceService } from "./application/services/finance.service";
import { FinancialTransactionRepository } from "./domain/repositories/financial-transaction-repository.interface";
import { FinancialTransactionPrismaRepository } from "./infrastructure/repositories/financial-transaction-prisma.repository";

@Module({
    imports: [PrismaModule],
    providers: [
        FinanceService,
        {
            provide: FinancialTransactionRepository,
            useClass: FinancialTransactionPrismaRepository,
        },
    ],
    controllers: [CrmFinanceController],
    exports: [FinanceService],
})
export class FinanceModule {}
