import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { ClubPolicyModule } from "@modules/portal/crm/club-policy/club-policy.module";
import { FinanceModule } from "@modules/portal/crm/finance/finance.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { RecordsModule } from "@modules/portal/crm/records/records.module";

import { CabinetMonthlyLimitController } from "./api/controllers/cabinet-monthly-limit.controller";
import { CabinetOrdersController } from "./api/controllers/cabinet-orders.controller";
import { CrmMemberLimitController } from "./api/controllers/crm-member-limit.controller";
import { CrmOrdersController } from "./api/controllers/crm-orders.controller";
import { MonthlyLimitStatusService } from "./application/services/monthly-limit-status.service";
import { OrderPlacementService } from "./application/services/order-placement.service";
import { OrderStagesService } from "./application/services/order-stages.service";
import { OrdersService } from "./application/services/orders.service";
import { PlaceCabinetOrderUseCase } from "./application/use-cases/place-cabinet-order.use-case";
import { PlaceStaffOrderUseCase } from "./application/use-cases/place-staff-order.use-case";
import { OrderRepository } from "./domain/repositories/order-repository.interface";
import { OrderStageRepository } from "./domain/repositories/order-stage-repository.interface";
import { OrderPrismaRepository } from "./infrastructure/repositories/order-prisma.repository";
import { OrderStagePrismaRepository } from "./infrastructure/repositories/order-stage-prisma.repository";

@Module({
    imports: [
        PrismaModule,
        CatalogModule,
        MembersModule,
        ClubPolicyModule,
        RecordsModule,
        FinanceModule,
    ],
    providers: [
        OrdersService,
        OrderStagesService,
        OrderPlacementService,
        PlaceCabinetOrderUseCase,
        PlaceStaffOrderUseCase,
        MonthlyLimitStatusService,
        {
            provide: OrderRepository,
            useClass: OrderPrismaRepository,
        },
        {
            provide: OrderStageRepository,
            useClass: OrderStagePrismaRepository,
        },
    ],
    controllers: [
        CrmOrdersController,
        CabinetOrdersController,
        CrmMemberLimitController,
        CabinetMonthlyLimitController,
    ],
    exports: [OrdersService, OrderPlacementService],
})
export class OrdersModule {}
