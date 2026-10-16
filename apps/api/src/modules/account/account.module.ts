import { Module } from "@nestjs/common";

import { StorageModule } from "@storage/storage.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { AccountController } from "@modules/account/api/controllers/account.controller";
import { AccountProfileController } from "@modules/account/api/controllers/account-profile.controller";
import { AccountDocumentsService } from "@modules/account/application/services/account-documents.service";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { AccountProfileService } from "@modules/account/application/services/account-profile.service";
import { DocumentAccessLogService } from "@modules/account/application/services/document-access-log.service";
import { DocumentNumberCipher } from "@modules/account/application/services/document-number.cipher";
import { DocumentNumberBackfill } from "@modules/account/application/services/document-number-backfill.service";
import { MemberDocumentSharingService } from "@modules/account/application/services/member-document-sharing.service";
import { AccountProfileRepository } from "@modules/account/domain/repositories/account-profile-repository.interface";
import { DocumentAccessLogRepository } from "@modules/account/domain/repositories/document-access-log-repository.interface";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { AccountProfilePrismaRepository } from "@modules/account/infrastructure/repositories/account-profile.repository";
import { DocumentAccessLogPrismaRepository } from "@modules/account/infrastructure/repositories/document-access-log.repository";
import { MemberDocumentSharePrismaRepository } from "@modules/account/infrastructure/repositories/member-document-share.repository";
import { UserDocumentPrismaRepository } from "@modules/account/infrastructure/repositories/user-document.repository";
import { UserSignaturePrismaRepository } from "@modules/account/infrastructure/repositories/user-signature.repository";

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [AccountController, AccountProfileController],
    providers: [
        AccountDocumentsService,
        AccountFilesService,
        MemberDocumentSharingService,
        DocumentAccessLogService,
        DocumentNumberCipher,
        DocumentNumberBackfill,
        AccountProfileService,
        { provide: AccountProfileRepository, useClass: AccountProfilePrismaRepository },
        {
            provide: DocumentAccessLogRepository,
            useClass: DocumentAccessLogPrismaRepository,
        },
        {
            provide: UserDocumentRepository,
            useClass: UserDocumentPrismaRepository,
        },
        {
            provide: UserSignatureRepository,
            useClass: UserSignaturePrismaRepository,
        },
        {
            provide: MemberDocumentShareRepository,
            useClass: MemberDocumentSharePrismaRepository,
        },
    ],
    exports: [
        AccountDocumentsService,
        AccountProfileService,
        AccountFilesService,
        MemberDocumentSharingService,
        DocumentAccessLogService,
        UserDocumentRepository,
        UserSignatureRepository,
        MemberDocumentShareRepository,
    ],
})
export class AccountModule {}
