import { Injectable } from "@nestjs/common";

import { MemberConsentStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    MemberDocumentShareRepository,
    SharedClub,
} from "@modules/account/domain/repositories/member-document-share-repository.interface";

const CLUB_SELECT = {
    id: true,
    portalId: true,
    portal: { select: { name: true, displayName: true } },
} satisfies Prisma.MemberSelect;

type ClubRow = Prisma.MemberGetPayload<{ select: typeof CLUB_SELECT }>;

const toClub = (row: ClubRow): SharedClub => ({
    memberId: row.id,
    portalId: row.portalId,
    slug: row.portal.name,
    displayName: row.portal.displayName,
});

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

    async setSignatureShared(memberId: string, shared: boolean): Promise<void> {
        await this.prisma.member.update({
            where: { id: memberId },
            data: { signatureShared: shared },
        });
    }

    async revokeDocument(memberId: string, documentId: string): Promise<void> {
        await this.prisma.memberDocumentShare.deleteMany({
            where: { memberId, userDocumentId: documentId },
        });
    }

    async revokeAllForMember(memberId: string): Promise<void> {
        await this.prisma.$transaction([
            this.prisma.memberDocumentShare.deleteMany({ where: { memberId } }),
            this.prisma.member.update({
                where: { id: memberId },
                data: { signatureShared: false },
            }),
        ]);
    }

    async clearSignatureShares(userId: string): Promise<void> {
        await this.prisma.member.updateMany({
            where: { userId, signatureShared: true },
            data: { signatureShared: false },
        });
    }

    async countDocumentSharesExcept(documentId: string, exceptMemberId?: string): Promise<number> {
        return this.prisma.memberDocumentShare.count({
            where: {
                userDocumentId: documentId,
                ...(exceptMemberId ? { memberId: { not: exceptMemberId } } : {}),
            },
        });
    }

    async countSignatureSharesExcept(userId: string, exceptMemberId?: string): Promise<number> {
        return this.prisma.member.count({
            where: {
                userId,
                signatureShared: true,
                ...(exceptMemberId ? { id: { not: exceptMemberId } } : {}),
            },
        });
    }

    async findClubsByDocumentIds(documentIds: string[]): Promise<Map<string, SharedClub[]>> {
        const result = new Map<string, SharedClub[]>();
        if (documentIds.length === 0) {
            return result;
        }
        const rows = await this.prisma.memberDocumentShare.findMany({
            where: { userDocumentId: { in: documentIds } },
            select: { userDocumentId: true, member: { select: CLUB_SELECT } },
        });
        for (const row of rows) {
            const clubs = result.get(row.userDocumentId) ?? [];
            clubs.push(toClub(row.member));
            result.set(row.userDocumentId, clubs);
        }
        return result;
    }

    async findClubsWithSignature(userId: string): Promise<SharedClub[]> {
        const rows = await this.prisma.member.findMany({
            where: { userId, signatureShared: true },
            select: CLUB_SELECT,
        });
        return rows.map(toClub);
    }

    async findOwnShareableMembership(
        userId: string,
        memberId: string
    ): Promise<{ id: string; portalId: string } | null> {
        return this.prisma.member.findFirst({
            where: {
                id: memberId,
                userId,
                isActive: true,
                consentStatus: MemberConsentStatus.confirmed,
            },
            select: { id: true, portalId: true },
        });
    }
}
