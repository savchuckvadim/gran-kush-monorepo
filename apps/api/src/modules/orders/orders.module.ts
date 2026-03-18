import { Module } from "@nestjs/common";

import { CatalogModule } from "@catalog/catalog.module";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmOrdersController } from "./api/controllers/crm-orders.controller";
import { LkOrdersController } from "./api/controllers/lk-orders.controller";
import { OrdersService } from "./application/services/orders.service";
import { OrderRepository } from "./domain/repositories/order-repository.interface";
import { OrderPrismaRepository } from "./infrastructure/repositories/order-prisma.repository";

@Module({
    imports: [PrismaModule, CatalogModule],
    providers: [
        OrdersService,
        {
            provide: OrderRepository,
            useClass: OrderPrismaRepository,
        },
    ],
    controllers: [CrmOrdersController, LkOrdersController],
    exports: [OrdersService],
})
export class OrdersModule {}
