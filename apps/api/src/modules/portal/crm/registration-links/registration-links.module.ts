import { Module } from "@nestjs/common";

import { UsersModule } from "@users/users.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { MembersModule } from "@modules/portal/crm/members/members.module";

import { CrmRegistrationLinksController } from "./api/controllers/crm-registration-links.controller";
import { PublicRegistrationLinksController } from "./api/controllers/public-registration-links.controller";
import { RegistrationLinksService } from "./application/services/registration-links.service";

@Module({
    imports: [PrismaModule, UsersModule, EntityFieldsModule, MembersModule],
    controllers: [CrmRegistrationLinksController, PublicRegistrationLinksController],
    providers: [RegistrationLinksService],
    exports: [RegistrationLinksService],
})
export class RegistrationLinksModule {}
