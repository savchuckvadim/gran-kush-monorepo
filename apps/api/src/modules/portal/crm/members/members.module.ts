import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { PrismaModule } from "@common/prisma/prisma.module";
import { EntityFieldsModule } from "@modules/portal/crm/entity-fields/entity-fields.module";
import { CrmMembersController } from "@modules/portal/crm/members/api/controllers/crm-members.controller";
import { LkMembersController } from "@modules/portal/crm/members/api/controllers/lk-members.controller";
import { MemberFilesService } from "@modules/portal/crm/members/application/services/member-files.service";
import { MembersService } from "@modules/portal/crm/members/application/services/members.service";
import { DocumentRepository } from "@modules/portal/crm/members/domain/repositories/document-repository.interface";
import { IdentityDocumentRepository } from "@modules/portal/crm/members/domain/repositories/identity-document-repository.interface";
import { MemberDocumentRepository } from "@modules/portal/crm/members/domain/repositories/member-document-repository.interface";
import { MemberMjStatusRepository } from "@modules/portal/crm/members/domain/repositories/member-mj-status-repository.interface";
import { MemberRepository } from "@modules/portal/crm/members/domain/repositories/member-repository.interface";
import { MjStatusRepository } from "@modules/portal/crm/members/domain/repositories/mj-status-repository.interface";
import { SignatureRepository } from "@modules/portal/crm/members/domain/repositories/signature-repository.interface";
import { MEMBER_FILES_QUEUE_NAME } from "@modules/portal/crm/members/events/member-files-events.constants";
import { MemberFilesProcessor } from "@modules/portal/crm/members/infrastructure/processors/member-files.processor";
import { DocumentPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/document.repository";
import { IdentityDocumentPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/identity-document.repository";
import { MemberPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/member.repository";
import { MemberDocumentPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/member-document.repository";
import { MemberMjStatusPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/member-mj-status.repository";
import { MjStatusPrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/mj-status.repository";
import { SignaturePrismaRepository } from "@modules/portal/crm/members/infrastructure/repositories/signature.repository";
import { StorageModule } from "@modules/storage";
import { UsersModule } from "@modules/users";

@Module({
    imports: [
        UsersModule,
        PrismaModule,
        EntityFieldsModule,
        StorageModule,
        BullModule.registerQueue({
            name: MEMBER_FILES_QUEUE_NAME,
        }),
    ],
    providers: [
        MembersService,
        MemberFilesService,
        MemberFilesProcessor,
        {
            provide: MemberRepository,
            useClass: MemberPrismaRepository,
        },
        {
            provide: MjStatusRepository,
            useClass: MjStatusPrismaRepository,
        },
        {
            provide: MemberMjStatusRepository,
            useClass: MemberMjStatusPrismaRepository,
        },
        {
            provide: DocumentRepository,
            useClass: DocumentPrismaRepository,
        },
        {
            provide: MemberDocumentRepository,
            useClass: MemberDocumentPrismaRepository,
        },
        {
            provide: IdentityDocumentRepository,
            useClass: IdentityDocumentPrismaRepository,
        },
        {
            provide: SignatureRepository,
            useClass: SignaturePrismaRepository,
        },
    ],
    controllers: [CrmMembersController, LkMembersController],
    exports: [
        MembersService,
        MemberFilesService,
        MemberRepository, // Экспортируем для использования в других модулях (например, MemberAuthModule)
    ],
})
export class MembersModule {}
