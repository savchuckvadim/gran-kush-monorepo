import { Module } from "@nestjs/common";

import { MembersModule } from "@members/members.module";
import { QrCodesModule } from "@qr-codes/qr-codes.module";

import { PrismaModule } from "@common/prisma/prisma.module";

import { CrmPresenceController } from "./api/controllers/crm-presence.controller";
import { LkPresenceController } from "./api/controllers/lk-presence.controller";
import { PresenceService } from "./application/services/presence.service";
import { PresenceSessionRepository } from "./domain/repositories/presence-session-repository.interface";
import { PresenceSessionPrismaRepository } from "./infrastructure/repositories/presence-session-prisma.repository";

@Module({
    imports: [PrismaModule, QrCodesModule, MembersModule],
    providers: [
        PresenceService,
        {
            provide: PresenceSessionRepository,
            useClass: PresenceSessionPrismaRepository,
        },
    ],
    controllers: [CrmPresenceController, LkPresenceController],
    exports: [PresenceService],
})
export class PresenceModule {}
