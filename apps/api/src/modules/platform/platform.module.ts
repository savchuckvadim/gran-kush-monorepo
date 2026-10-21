import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";

import { PlatformPortalsController } from "./api/controllers/platform-portals.controller";
import { PlatformReferenceDataController } from "./api/controllers/platform-reference-data.controller";
import { PlatformAuthController } from "./auth/api/controllers/platform-auth.controller";
import { PlatformAuthService } from "./auth/application/services/platform-auth.service";
import { PlatformJwtAuthGuard } from "./auth/infrastructure/guards/platform-jwt-auth.guard";

/** Админка платформы; её сессии — общий `SessionsModule` (глобальный) с аудиторией `platform`. */
@Module({
    imports: [PrismaModule, SharedAuthModule],
    controllers: [
        PlatformAuthController,
        PlatformPortalsController,
        PlatformReferenceDataController,
    ],
    providers: [PlatformAuthService, PlatformJwtAuthGuard],
    exports: [PlatformAuthService, PlatformJwtAuthGuard],
})
export class PlatformModule {}
