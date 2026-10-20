import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { FinanceModule } from "@modules/portal/crm/finance/finance.module";

import { CrmMarginController } from "./api/controllers/crm-margin.controller";
import { CrmStockController } from "./api/controllers/crm-stock.controller";
import { MarginService } from "./application/services/margin.service";
import { StockService } from "./application/services/stock.service";
import { StockViewsService } from "./application/services/stock-views.service";
import { ReceivePurchaseUseCase } from "./application/use-cases/receive-purchase.use-case";
import { SoldLinesSource } from "./domain/sold-lines.source";
import { StockRepository } from "./domain/stock-repository.interface";
import { SoldLinesPrismaSource } from "./infrastructure/sold-lines-prisma.source";
import { StockPrismaRepository } from "./infrastructure/stock-prisma.repository";

/**
 * Склад (TASK-804): журнал движений, поставки с себестоимостью, списания с причиной. Заказы
 * пишут в тот же журнал внутри своей транзакции (`orders/infrastructure/order-stock.prisma.ts`),
 * финансы получают расход на закупку через `PurchaseLedgerService`.
 */
@Module({
    imports: [PrismaModule, FinanceModule],
    providers: [
        StockService,
        StockViewsService,
        ReceivePurchaseUseCase,
        MarginService,
        { provide: StockRepository, useClass: StockPrismaRepository },
        { provide: SoldLinesSource, useClass: SoldLinesPrismaSource },
    ],
    controllers: [CrmStockController, CrmMarginController],
    exports: [StockService],
})
export class StockModule {}
