import { Injectable } from "@nestjs/common";

import { MemberConsentStatus, MemberJoinSource, Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import {
    EntityRecordFilterBuilder,
    escapeLike,
    recordTextContains,
    searchWords,
} from "@modules/portal/crm/entity-fields/infrastructure/entity-record-filter.builder";
import {
    MemberWithRelations,
    memberWithRelationsInclude,
} from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    MemberListFilters,
    MemberRepository,
} from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

@Injectable()
export class MemberPrismaRepository implements MemberRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly recordFilter: EntityRecordFilterBuilder
    ) {}

    async findPageByPortal(
        portalId: string,
        filters: MemberListFilters,
        take: number,
        skip: number
    ): Promise<{ items: MemberWithRelations[]; total: number }> {
        const where = await this.listWhere(portalId, filters);
        const [items, total] = await Promise.all([
            this.prisma.member.findMany({
                where,
                take,
                skip,
                orderBy: { createdAt: "desc" },
                include: memberWithRelationsInclude,
            }),
            this.prisma.member.count({ where }),
        ]);
        return { items, total };
    }

    private async listWhere(
        portalId: string,
        filters: MemberListFilters
    ): Promise<Prisma.MemberWhereInput> {
        const profile = await this.recordFilter.conditions(
            portalId,
            ENTITY_DEFINITION_CODES.MEMBER,
            filters.conditions
        );
        if (filters.statusItemId) {
            profile.push({ statusItemId: filters.statusItemId });
        }

        const and: Prisma.MemberWhereInput[] = searchWords(filters.q).map((word) => ({
            OR: [
                { membershipNumber: { contains: escapeLike(word), mode: "insensitive" } },
                { user: { email: { contains: escapeLike(word), mode: "insensitive" } } },
                { profile: recordTextContains(word) },
            ],
        }));
        if (profile.length > 0) {
            and.push({ profile: { AND: profile } });
        }
        return and.length > 0 ? { portalId, AND: and } : { portalId };
    }

    async countByPortal(portalId: string): Promise<number> {
        return this.prisma.member.count({ where: { portalId } });
    }

    async findByIdForPortal(id: string, portalId: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findFirst({
            where: { id, portalId },
            include: memberWithRelationsInclude,
        });
    }

    async findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { userId_portalId: { userId, portalId } },
            include: memberWithRelationsInclude,
        });
    }

    async findAllByUser(userId: string): Promise<MemberWithRelations[]> {
        return this.prisma.member.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: memberWithRelationsInclude,
        });
    }

    async findByConsentToken(tokenHash: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { consentToken: tokenHash },
            include: memberWithRelationsInclude,
        });
    }

    async create(data: {
        userId: string;
        portalId: string;
        membershipNumber?: string;
        statusItemId?: string;
        joinSource?: MemberJoinSource;
        registrationLinkId?: string;
        createdByEmployeeId?: string;
        consent?: { tokenHash: string; requestedAt: Date };
    }): Promise<MemberWithRelations> {
        return this.prisma.$transaction(async (tx) => {
            const def = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId: data.portalId,
                        code: ENTITY_DEFINITION_CODES.MEMBER,
                    },
                },
            });
            const record = await tx.entityRecord.create({
                data: {
                    portalId: data.portalId,
                    entityDefinitionId: def.id,
                    statusItemId: data.statusItemId ?? null,
                    createdByEmployeeId: data.createdByEmployeeId ?? null,
                },
            });
            return tx.member.create({
                data: {
                    userId: data.userId,
                    portalId: data.portalId,
                    entityRecordId: record.id,
                    membershipNumber: data.membershipNumber,
                    joinSource: data.joinSource ?? MemberJoinSource.self,
                    registrationLinkId: data.registrationLinkId ?? null,
                    createdByEmployeeId: data.createdByEmployeeId ?? null,
                    ...(data.consent
                        ? {
                              consentStatus: MemberConsentStatus.pending,
                              consentToken: data.consent.tokenHash,
                              consentRequestedAt: data.consent.requestedAt,
                          }
                        : {}),
                },
                include: memberWithRelationsInclude,
            });
        });
    }

    async update(
        id: string,
        data: Partial<{
            membershipNumber: string | null;
            isActive: boolean;
            claimedAt: Date;
            consentStatus: MemberConsentStatus;
            consentToken: string | null;
            consentRequestedAt: Date | null;
            consentConfirmedAt: Date | null;
            signatureShared: boolean;
        }>
    ): Promise<MemberWithRelations> {
        return this.prisma.member.update({
            where: { id },
            data,
            include: memberWithRelationsInclude,
        });
    }

    async deleteWithProfile(id: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            const member = await tx.member.findUniqueOrThrow({
                where: { id },
                select: { entityRecordId: true },
            });
            await tx.member.delete({ where: { id } });
            await tx.entityRecord.delete({ where: { id: member.entityRecordId } });
        });
    }
}
