import { Module } from "@nestjs/common";

import { StorageModule } from "@storage/storage.module";

import { PrismaModule } from "@common/prisma/prisma.module";
import { AccountController } from "@modules/account/api/controllers/account.controller";
import { AccountDocumentsService } from "@modules/account/application/services/account-documents.service";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";
import { MemberDocumentSharePrismaRepository } from "@modules/account/infrastructure/repositories/member-document-share.repository";
import { UserDocumentPrismaRepository } from "@modules/account/infrastructure/repositories/user-document.repository";
import { UserSignaturePrismaRepository } from "@modules/account/infrastructure/repositories/user-signature.repository";

@Module({
    imports: [PrismaModule, StorageModule],
    controllers: [AccountController],
    providers: [
        AccountDocumentsService,
        AccountFilesService,
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
        UserDocumentRepository,
        UserSignatureRepository,
        MemberDocumentShareRepository,
    ],
})
export class AccountModule {}
