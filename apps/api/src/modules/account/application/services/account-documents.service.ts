import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { UserDocument, UserDocumentSide, UserSignature } from "@prisma/client";

import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

/** Документы и подпись на уровне аккаунта — переиспользуются между клубами. */
@Injectable()
export class AccountDocumentsService {
    constructor(
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly accountFiles: AccountFilesService
    ) {}

    async listDocuments(userId: string): Promise<UserDocument[]> {
        return this.userDocumentRepository.findAllByUser(userId);
    }

    async uploadDocument(
        userId: string,
        data: { type: string; side?: UserDocumentSide; number?: string; file: string }
    ): Promise<UserDocument> {
        const side = data.side ?? UserDocumentSide.single;
        const storagePath = await this.accountFiles.savePrivateDataUrl(
            data.file,
            userId,
            `document-${data.type}-${side}`
        );
        return this.userDocumentRepository.upsertByUserTypeSide({
            userId,
            type: data.type,
            side,
            storagePath,
            number: data.number ?? null,
        });
    }

    async deleteDocument(userId: string, documentId: string): Promise<void> {
        const doc = await this.userDocumentRepository.findById(documentId);
        if (!doc) {
            throw new NotFoundException("Document not found");
        }
        if (doc.userId !== userId) {
            throw new ForbiddenException("Document belongs to another account");
        }
        await this.userDocumentRepository.deleteById(documentId);
    }

    async getSignature(userId: string): Promise<UserSignature | null> {
        return this.userSignatureRepository.findByUser(userId);
    }

    async putSignature(userId: string, file: string): Promise<UserSignature> {
        const storagePath = await this.accountFiles.savePrivateDataUrl(file, userId, "signature");
        return this.userSignatureRepository.upsertByUser({ userId, storagePath });
    }

    async hasSignature(userId: string): Promise<boolean> {
        const signature = await this.userSignatureRepository.findByUser(userId);
        return signature !== null;
    }
}
