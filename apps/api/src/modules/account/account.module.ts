import { Module } from "@nestjs/common";

import { StorageModule } from "@storage/storage.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { AccountController } from "@modules/account/api/controllers/account.controller";
import { AccountDocumentsService } from "@modules/account/application/services/account-documents.service";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { DocumentAccessLogService } from "@modules/account/application/services/document-access-log.service";
import { DocumentNumberCipher } from "@modules/account/application/services/document-number.cipher";
import { DocumentNumberBackfill } from "@modules/account/application/services/document-number-backfill.service";
import { MemberDocumentSharingService } from "@modules/account/application/services/member-document-sharing.service";
import { DocumentAccessLogRepository } from "@modules/account/domain/repositories/document-access-log-repository.interface";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { DocumentAccessLogPrismaRepository } from "@modules/account/infrastructure/repositories/document-access-log.repository";
import { MemberDocumentSharePrismaRepository } from "@modules/account/infrastructure/repositories/member-document-share.repository";
import { UserDocumentPrismaRepository } from "@modules/account/infrastructure/repositories/user-document.repository";
import { UserSignaturePrismaRepository } from "@modules/account/infrastructure/repositories/user-signature.repository";

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [AccountController],
    providers: [
        AccountDocumentsService,
        AccountFilesService,
        MemberDocumentSharingService,
        DocumentAccessLogService,
        DocumentNumberCipher,
        DocumentNumberBackfill,
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
        AccountFilesService,
        MemberDocumentSharingService,
        DocumentAccessLogService,
        UserDocumentRepository,
        UserSignatureRepository,
        MemberDocumentShareRepository,
    ],
})
export class AccountModule {}
