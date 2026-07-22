import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { MembershipGuard } from "@common/portal";
import { PrismaModule } from "@common/prisma/prisma.module";

import { PortalResolutionService } from "./application/services/portal-resolution.service";
import { PortalContextMiddleware } from "./infrastructure/middleware/portal-context.middleware";

/**
 * Глобальный tenant-контекст: middleware резолва портала + guard membership.
 */
@Global()
@Module({
    imports: [PrismaModule],
    providers: [PortalResolutionService, PortalContextMiddleware, MembershipGuard],
    exports: [PortalResolutionService, MembershipGuard],
})
export class PortalContextModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        // Express 5 (path-to-regexp v8): голый "*" не матчит ни один путь
        consumer.apply(PortalContextMiddleware).forRoutes("{*splat}");
    }
}
