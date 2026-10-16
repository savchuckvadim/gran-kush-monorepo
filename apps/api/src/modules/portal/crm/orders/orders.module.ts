import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { CatalogModule } from "@modules/portal/crm/catalog/catalog.module";
import { ClubPolicyModule } from "@modules/portal/crm/club-policy/club-policy.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { CabinetOrdersController } from "./api/controllers/cabinet-orders.controller";
import { CrmOrdersController } from "./api/controllers/crm-orders.controller";
import { CabinetOrderPlacementService } from "./application/services/cabinet-order-placement.service";
import { OrdersService } from "./application/services/orders.service";
import { OrderRepository } from "./domain/repositories/order-repository.interface";
import { OrderPrismaRepository } from "./infrastructure/repositories/order-prisma.repository";

@Module({
    imports: [PrismaModule, CatalogModule, MembersModule, ClubPolicyModule],
    providers: [
        OrdersService,
        CabinetOrderPlacementService,
        {
            provide: OrderRepository,
            useClass: OrderPrismaRepository,
        },
    ],
    controllers: [CrmOrdersController, CabinetOrdersController],
    exports: [OrdersService],
})
export class OrdersModule {}
