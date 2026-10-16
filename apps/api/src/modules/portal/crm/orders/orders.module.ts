import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { ClubPolicyModule } from "@modules/portal/crm/club-policy/club-policy.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { CabinetOrdersController } from "./api/controllers/cabinet-orders.controller";
import { CrmOrdersController } from "./api/controllers/crm-orders.controller";
import { OrderPlacementService } from "./application/services/order-placement.service";
import { OrderStagesService } from "./application/services/order-stages.service";
import { OrdersService } from "./application/services/orders.service";
import { PlaceCabinetOrderUseCase } from "./application/use-cases/place-cabinet-order.use-case";
import { PlaceStaffOrderUseCase } from "./application/use-cases/place-staff-order.use-case";
import { OrderRepository } from "./domain/repositories/order-repository.interface";
import { OrderPrismaRepository } from "./infrastructure/repositories/order-prisma.repository";

@Module({
    imports: [PrismaModule, CatalogModule, MembersModule, ClubPolicyModule],
    providers: [
        OrdersService,
        OrderStagesService,
        OrderPlacementService,
        PlaceCabinetOrderUseCase,
        PlaceStaffOrderUseCase,
        {
            provide: OrderRepository,
            useClass: OrderPrismaRepository,
        },
    ],
    controllers: [CrmOrdersController, CabinetOrdersController],
    exports: [OrdersService, OrderPlacementService],
})
export class OrdersModule {}
