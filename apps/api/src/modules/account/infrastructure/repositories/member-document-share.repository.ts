import { Injectable } from "@nestjs/common";

import { MemberConsentStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { MemberDocumentShareRepository } from "@modules/account/domain/repositories/member-document-share-repository.interface";

@Injectable()
export class MemberDocumentSharePrismaRepository implements MemberDocumentShareRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findDocumentIdsForMember(memberId: string): Promise<string[]> {
        const rows = await this.prisma.memberDocumentShare.findMany({
            where: { memberId },
            select: { userDocumentId: true },
        });
        return rows.map((row) => row.userDocumentId);
    }

    async shareDocuments(memberId: string, documentIds: string[]): Promise<void> {
        if (documentIds.length === 0) {
            return;
        }
        await this.prisma.memberDocumentShare.createMany({
            data: documentIds.map((userDocumentId) => ({ memberId, userDocumentId })),
            skipDuplicates: true,
        });
    }

    async shareAllOfUser(memberId: string, userId: string): Promise<void> {
        const documents = await this.prisma.userDocument.findMany({
            where: { userId },
            select: { id: true },
        });
        await this.shareDocuments(
            memberId,
            documents.map((document) => document.id)
        );
        const signature = await this.prisma.userSignature.findUnique({
            where: { userId },
            select: { id: true },
        });
        await this.prisma.member.update({
            where: { id: memberId },
            data: { signatureShared: signature !== null },
        });
    }

    async shareWithConfirmedMemberships(userId: string, documentId: string): Promise<void> {
        const members = await this.prisma.member.findMany({
            where: { userId, consentStatus: MemberConsentStatus.confirmed },
            select: { id: true },
        });
        if (members.length === 0) {
            return;
        }
        await this.prisma.memberDocumentShare.createMany({
            data: members.map((member) => ({ memberId: member.id, userDocumentId: documentId })),
            skipDuplicates: true,
        });
    }

    async setSignatureShared(memberId: string, shared: boolean): Promise<void> {
        await this.prisma.member.update({
            where: { id: memberId },
            data: { signatureShared: shared },
        });
    }

    async markSignatureSharedForConfirmedMemberships(userId: string): Promise<void> {
        await this.prisma.member.updateMany({
            where: { userId, consentStatus: MemberConsentStatus.confirmed },
            data: { signatureShared: true },
        });
    }
}
