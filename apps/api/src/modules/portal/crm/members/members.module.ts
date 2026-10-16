import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { MailModule } from "@mail/mail.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { MEMBER_FILES_JOB_OPTIONS } from "@common/queue/job-options";
import { AccountModule } from "@modules/account/account.module";
import { SharedAuthModule } from "@modules/portal/auth/shared/shared-auth.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { CabinetMembersController } from "@modules/portal/crm/members/api/controllers/cabinet-members.controller";
import { CabinetMembershipsController } from "@modules/portal/crm/members/api/controllers/cabinet-memberships.controller";
import { CrmMembersController } from "@modules/portal/crm/members/api/controllers/crm-members.controller";
import { PublicMemberConsentController } from "@modules/portal/crm/members/api/controllers/public-member-consent.controller";
import { JoinPortalService } from "@modules/portal/crm/members/application/services/join-portal.service";
import { MemberConsentService } from "@modules/portal/crm/members/application/services/member-consent.service";
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
        MailModule,
        SharedAuthModule,
        BullModule.registerQueue({
            name: MEMBER_FILES_QUEUE_NAME,
            defaultJobOptions: MEMBER_FILES_JOB_OPTIONS,
        }),
    ],
    providers: [
        MembersService,
        JoinPortalService,
        MemberConsentService,
        MemberFilesService,
        MemberFilesProcessor,
        {
            provide: MemberRepository,
            useClass: MemberPrismaRepository,
        },
    ],
    controllers: [
        CrmMembersController,
        CabinetMembersController,
        CabinetMembershipsController,
        PublicMemberConsentController,
    ],
    exports: [MembersService, JoinPortalService, MemberFilesService, MemberRepository],
})
export class MembersModule {}
