import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { RedisModule } from "@common/redis/redis.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { CabinetRegistrationLinksController } from "./api/controllers/cabinet-registration-links.controller";
import { CrmRegistrationLinksController } from "./api/controllers/crm-registration-links.controller";
import { PublicRegistrationLinksController } from "./api/controllers/public-registration-links.controller";
import { RegistrationLinkPresenceService } from "./application/services/registration-link-presence.service";
import { RegistrationLinksService } from "./application/services/registration-links.service";

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        UsersModule,
        EntityFieldsModule,
        MembersModule,
        SharedAuthModule,
    ],
    controllers: [
        CrmRegistrationLinksController,
        PublicRegistrationLinksController,
        CabinetRegistrationLinksController,
    ],
    providers: [RegistrationLinksService, RegistrationLinkPresenceService],
    exports: [RegistrationLinksService],
})
export class RegistrationLinksModule {}
