import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";
import { QrCodesModule } from "@modules/portal/crm/qr-codes/qr-codes.module";

import { CabinetPresenceController } from "./api/controllers/cabinet-presence.controller";
import { CrmPresenceController } from "./api/controllers/crm-presence.controller";
import { CrmPresenceSettingsController } from "./api/controllers/crm-presence-settings.controller";
import { PresenceService } from "./application/services/presence.service";
import { PresenceSettingsService } from "./application/services/presence-settings.service";
import { ConfirmDoorScanUseCase } from "./application/use-cases/confirm-door-scan.use-case";
import { PresenceSessionRepository } from "./domain/repositories/presence-session-repository.interface";
import { PresenceSettingsRepository } from "./domain/repositories/presence-settings-repository.interface";
import { PresenceSessionPrismaRepository } from "./infrastructure/repositories/presence-session-prisma.repository";
import { PresenceSettingsPrismaRepository } from "./infrastructure/repositories/presence-settings-prisma.repository";

@Module({
    imports: [PrismaModule, QrCodesModule, MembersModule],
    providers: [
        ConfirmDoorScanUseCase,
        PresenceSettingsService,
        { provide: PresenceSettingsRepository, useClass: PresenceSettingsPrismaRepository },
        PresenceService,
        {
            provide: PresenceSessionRepository,
            useClass: PresenceSessionPrismaRepository,
        },
    ],
    controllers: [CrmPresenceController, CabinetPresenceController, CrmPresenceSettingsController],
    exports: [PresenceService, PresenceSettingsService],
})
export class PresenceModule {}
