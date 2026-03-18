import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";

import { CrmMembersController } from "@members/api/controllers/crm-members.controller";
import { LkMembersController } from "@members/api/controllers/lk-members.controller";
import { MemberFilesService } from "@members/application/services/member-files.service";
import { MembersService } from "@members/application/services/members.service";
import { DocumentRepository } from "@members/domain/repositories/document-repository.interface";
import { IdentityDocumentRepository } from "@members/domain/repositories/identity-document-repository.interface";
import { MemberDocumentRepository } from "@members/domain/repositories/member-document-repository.interface";
import { MemberMjStatusRepository } from "@members/domain/repositories/member-mj-status-repository.interface";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";
import { MjStatusRepository } from "@members/domain/repositories/mj-status-repository.interface";
import { SignatureRepository } from "@members/domain/repositories/signature-repository.interface";
import { MEMBER_FILES_QUEUE_NAME } from "@members/events/member-files-events.constants";
import { MemberFilesProcessor } from "@members/infrastructure/processors/member-files.processor";
import { DocumentPrismaRepository } from "@members/infrastructure/repositories/document.repository";
import { IdentityDocumentPrismaRepository } from "@members/infrastructure/repositories/identity-document.repository";
import { MemberPrismaRepository } from "@members/infrastructure/repositories/member.repository";
import { MemberDocumentPrismaRepository } from "@members/infrastructure/repositories/member-document.repository";
import { MemberMjStatusPrismaRepository } from "@members/infrastructure/repositories/member-mj-status.repository";
import { MjStatusPrismaRepository } from "@members/infrastructure/repositories/mj-status.repository";
import { SignaturePrismaRepository } from "@members/infrastructure/repositories/signature.repository";

import { PrismaModule } from "@common/prisma/prisma.module";
import { StorageModule } from "@modules/storage";
import { UsersModule } from "@modules/users";

@Module({
    imports: [
        UsersModule,
        PrismaModule,
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
