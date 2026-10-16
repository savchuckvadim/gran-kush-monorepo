import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { UserDocument, UserDocumentSide, UserSignature } from "@prisma/client";

import { decodeDataUrl } from "@common/upload";
import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { MemberDocumentSharingService } from "@modules/account/application/services/member-document-sharing.service";
import {
    MemberDocumentShareRepository,
    SharedClub,
} from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

export interface AccountDocumentView {
    document: UserDocument;
    sharedWith: SharedClub[];
}

/**
 * Документы и подпись на уровне аккаунта — «Мой паспорт». Принадлежат владельцу и переиспользуются
 * между клубами, но клуб видит только то, что владелец ему показал (см. MemberDocumentSharingService).
 */
@Injectable()
export class AccountDocumentsService {
    constructor(
        private readonly userDocumentRepository: UserDocumentRepository,
        private readonly userSignatureRepository: UserSignatureRepository,
        private readonly shares: MemberDocumentShareRepository,
        private readonly sharing: MemberDocumentSharingService,
        private readonly accountFiles: AccountFilesService
    ) {}

    /** Текущие документы с клубами, которым показан каждый. */
    async listDocuments(userId: string): Promise<AccountDocumentView[]> {
        const documents = await this.userDocumentRepository.findAllByUser(userId);
        const clubs = await this.shares.findClubsByDocumentIds(documents.map((d) => d.id));
        return documents.map((document) => ({
            document,
            sharedWith: clubs.get(document.id) ?? [],
        }));
    }

    /** Загрузка в аккаунт клубам ничего не открывает: показ — отдельное решение владельца. */
    async uploadDocument(
        userId: string,
        data: { type: string; side?: UserDocumentSide; number?: string; file: string }
    ): Promise<UserDocument> {
        return this.accountFiles.replaceDocument({
            userId,
            type: data.type,
            side: data.side ?? UserDocumentSide.single,
            file: decodeDataUrl(data.file),
            number: data.number ?? null,
        });
    }

    async getOwnDocument(userId: string, documentId: string): Promise<UserDocument> {
        const doc = await this.userDocumentRepository.findById(documentId);
        if (!doc) {
            throw new NotFoundException("Document not found");
        }
        if (doc.userId !== userId) {
            throw new ForbiddenException("Document belongs to another account");
        }
        return doc;
    }

    async deleteDocument(userId: string, documentId: string): Promise<void> {
        const doc = await this.getOwnDocument(userId, documentId);
        await this.accountFiles.removeDocument(doc);
    }

    async getSignature(userId: string): Promise<UserSignature | null> {
        return this.userSignatureRepository.findByUser(userId);
    }

    async signatureSharedWith(userId: string): Promise<SharedClub[]> {
        return this.shares.findClubsWithSignature(userId);
    }

    async putSignature(userId: string, file: string): Promise<UserSignature> {
        return this.accountFiles.replaceSignature({ userId, file: decodeDataUrl(file) });
    }

    async deleteSignature(userId: string): Promise<void> {
        await this.accountFiles.removeSignature(userId);
    }

    async hasSignature(userId: string): Promise<boolean> {
        const signature = await this.userSignatureRepository.findByUser(userId);
        return signature !== null;
    }

    // ── Показ клубам ─────────────────────────────────────────────────────────

    async shareDocument(userId: string, documentId: string, memberId: string): Promise<void> {
        await this.getOwnDocument(userId, documentId);
        const membership = await this.sharing.requireMembership(userId, memberId);
        await this.sharing.shareSelected({
            userId,
            memberId: membership.id,
            portalId: membership.portalId,
            selection: { documentIds: [documentId] },
        });
    }

    async revokeDocument(userId: string, documentId: string, memberId: string): Promise<void> {
        await this.getOwnDocument(userId, documentId);
        const membership = await this.sharing.requireMembership(userId, memberId);
        await this.sharing.revokeDocument({
            userId,
            memberId: membership.id,
            portalId: membership.portalId,
            documentId,
        });
    }

    async shareSignature(userId: string, memberId: string): Promise<void> {
        const membership = await this.sharing.requireMembership(userId, memberId);
        await this.sharing.shareSelected({
            userId,
            memberId: membership.id,
            portalId: membership.portalId,
            selection: { signature: true },
        });
    }

    async revokeSignature(userId: string, memberId: string): Promise<void> {
        const membership = await this.sharing.requireMembership(userId, memberId);
        await this.sharing.revokeSignature({
            userId,
            memberId: membership.id,
            portalId: membership.portalId,
        });
    }
}
