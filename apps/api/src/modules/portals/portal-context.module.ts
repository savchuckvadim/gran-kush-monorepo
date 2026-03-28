import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { PortalTenantMatchGuard } from "@common/portal";
import { PrismaModule } from "@common/prisma/prisma.module";

import { PortalResolutionService } from "./application/services/portal-resolution.service";
import { PortalContextMiddleware } from "./infrastructure/middleware/portal-context.middleware";

/**
 * Глобальный tenant-контекст: middleware резолва портала + guard сверки с JWT.
 */
@Global()
@Module({
    imports: [PrismaModule],
    providers: [PortalResolutionService, PortalContextMiddleware, PortalTenantMatchGuard],
    exports: [PortalResolutionService, PortalTenantMatchGuard],
})
export class PortalContextModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(PortalContextMiddleware).forRoutes("*");
    }
}
