import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { AccountModule } from "@modules/account/account.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { CrmMembersController } from "@modules/portal/crm/members/api/controllers/crm-members.controller";
import { LkMembersController } from "@modules/portal/crm/members/api/controllers/lk-members.controller";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MemberFilesService } from "@modules/portal/crm/members/application/services/member-files.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { MemberRepository } from "@modules/portal/crm/members/domain/repositories/member-repository.interface";
import { MEMBER_FILES_QUEUE_NAME } from "@modules/portal/crm/members/events/member-files-events.constants";
import { MemberFilesProcessor } from "@modules/portal/crm/members/infrastructure/processors/member-files.processor";
import { MemberPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/member.repository";
import { StorageModule } from "@modules/storage";
import { UsersModule } from "@modules/users";

@Module({
    imports: [
        UsersModule,
        PrismaModule,
        EntityFieldsModule,
        StorageModule,
        AccountModule,
        BullModule.registerQueue({
            name: MEMBER_FILES_QUEUE_NAME,
        }),
    ],
    providers: [
        MembersService,
        JoinPortalService,
        MemberFilesService,
        MemberFilesProcessor,
        {
            provide: MemberRepository,
            useClass: MemberPrismaRepository,
        },
    ],
    controllers: [CrmMembersController, LkMembersController],
    exports: [MembersService, JoinPortalService, MemberFilesService, MemberRepository],
})
export class MembersModule {}
