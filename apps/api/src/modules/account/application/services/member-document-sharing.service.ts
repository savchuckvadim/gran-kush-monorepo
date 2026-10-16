import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { DocumentAccessAction, DocumentAccessActor } from "@prisma/client";

import { AccountFilesService } from "@modules/account/application/services/account-files.service";
import { DocumentAccessLogService } from "@modules/account/application/services/document-access-log.service";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

export interface ShareSelection {
    documentIds?: string[];
    signature?: boolean;
}

/**
 * Что владелец аккаунта показывает клубу. Единственное место, где открывается доступ клуба к
 * документам: вступление в клуб, подтверждение членства и раздел «Мой паспорт» ходят сюда же.
 *
 * Правила:
 * - показывается только то, что владелец выбрал явно; «показать всё» не бывает;
 * - выбрать можно лишь свои документы, чужой id — 400;
 * - всякий показ и отзыв пишется в журнал доступа;
 * - после отзыва прежние версии документов, которые больше никому не показаны, удаляются.
 */
@Injectable()
export class MemberDocumentSharingService {
    constructor(
        private readonly shares: MemberDocumentShareRepository,
        private readonly documents: UserDocumentRepository,
        private readonly signatures: UserSignatureRepository,
        private readonly files: AccountFilesService,
        private readonly accessLog: DocumentAccessLogService
    ) {}

    /**
     * Выбор можно показать: документы свои, подпись есть. Вызывается ДО создания членства, чтобы
     * ошибка в выборе не оставила клуб с полу-вступившим участником.
     */
    async assertSelectable(userId: string, selection: ShareSelection): Promise<void> {
        for (const id of new Set(selection.documentIds ?? [])) {
            const document = await this.documents.findById(id);
            if (!document || document.userId !== userId) {
                throw new BadRequestException("Unknown document");
            }
        }
        if (selection.signature) {
            const signature = await this.signatures.findByUser(userId);
            if (!signature) {
                throw new BadRequestException("The account has no signature to show");
            }
        }
    }

    /** Показать выбранное членству. Проверяет, что документы принадлежат аккаунту. */
    async shareSelected(input: {
        userId: string;
        memberId: string;
        portalId: string;
        selection: ShareSelection;
    }): Promise<void> {
        await this.assertSelectable(input.userId, input.selection);
        const documentIds = [...new Set(input.selection.documentIds ?? [])];

        await this.shares.shareDocuments(input.memberId, documentIds);
        for (const documentId of documentIds) {
            await this.record(input, "document", DocumentAccessAction.share, documentId);
            await this.replaceOlderVersions(input, documentId);
        }
        if (input.selection.signature) {
            await this.shares.setSignatureShared(input.memberId, true);
            await this.record(input, "signature", DocumentAccessAction.share);
        }
    }

    /**
     * Клуб видит один файл на слот документа. Когда владелец показывает новую версию, прежняя у
     * этого клуба снимается: иначе клуб держал бы у себя и старый, и новый паспорт. Снятые
     * версии, которые больше никому не показаны, удаляются.
     */
    private async replaceOlderVersions(
        input: { userId: string; memberId: string; portalId: string },
        documentId: string
    ): Promise<void> {
        const shown = await this.documents.findById(documentId);
        if (!shown) {
            return;
        }
        const versions = await this.documents.findVersions(input.userId, shown.type, shown.side);
        let replaced = false;
        for (const version of versions) {
            if (version.id === shown.id) continue;
            if (await this.shares.revokeDocument(input.memberId, version.id)) {
                replaced = true;
                await this.record(input, "document", DocumentAccessAction.revoke, version.id);
            }
        }
        if (replaced) {
            await this.files.pruneSuperseded(input.userId);
        }
    }

    async revokeDocument(input: {
        userId: string;
        memberId: string;
        portalId: string;
        documentId: string;
    }): Promise<void> {
        const membership = await this.requireMembership(input.userId, input.memberId);
        await this.shares.revokeDocument(membership.id, input.documentId);
        await this.record(input, "document", DocumentAccessAction.revoke, input.documentId);
        await this.files.pruneSuperseded(input.userId);
    }

    async revokeSignature(input: {
        userId: string;
        memberId: string;
        portalId: string;
    }): Promise<void> {
        const membership = await this.requireMembership(input.userId, input.memberId);
        await this.shares.setSignatureShared(membership.id, false);
        await this.record(input, "signature", DocumentAccessAction.revoke);
    }

    /** Выход из клуба: клуб теряет всё, что ему показывали. */
    async revokeAll(input: { userId: string; memberId: string; portalId: string }): Promise<void> {
        await this.shares.revokeAllForMember(input.memberId);
        await this.record(input, "document", DocumentAccessAction.revoke);
        await this.files.pruneSuperseded(input.userId);
    }

    /** Членство должно принадлежать аккаунту и быть подтверждённым: чужое выглядит как несуществующее. */
    async requireMembership(
        userId: string,
        memberId: string
    ): Promise<{ id: string; portalId: string }> {
        const membership = await this.shares.findOwnShareableMembership(userId, memberId);
        if (!membership) {
            throw new NotFoundException("Membership not found");
        }
        return membership;
    }

    private async record(
        input: { userId: string; memberId: string; portalId: string },
        subject: "document" | "signature",
        action: DocumentAccessAction,
        documentId?: string
    ): Promise<void> {
        await this.accessLog.record({
            userId: input.userId,
            subject,
            documentId,
            memberId: input.memberId,
            portalId: input.portalId,
            actorType: DocumentAccessActor.owner,
            actorId: input.userId,
            action,
        });
    }
}
