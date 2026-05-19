import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";
import {
    MemberWithRelations,
    memberWithRelationsInclude,
} from "@modules/portal/crm/members/domain/entity/member.entity";
import {
    MemberListFilters,
    MemberRepository,
} from "@modules/portal/crm/members/domain/repositories/member-repository.interface";

function parseFilterJsonValue(raw: string): Prisma.InputJsonValue {
    const trimmed = raw.trim();
    if (trimmed === "true") {
        return true;
    }
    if (trimmed === "false") {
        return false;
    }
    const num = Number(trimmed);
    if (trimmed !== "" && !Number.isNaN(num) && String(num) === trimmed) {
        return num;
    }
    try {
        return JSON.parse(trimmed) as Prisma.InputJsonValue;
    } catch {
        return trimmed;
    }
}

@Injectable()
export class MemberPrismaRepository implements MemberRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        limit: number = 100,
        skip?: number,
        filters?: MemberListFilters
    ): Promise<MemberWithRelations[]> {
        const where: Prisma.MemberWhereInput = {};

        if (filters?.portalId) {
            where.portalId = filters.portalId;
        }

        const profileFilter: Prisma.EntityRecordWhereInput = {};
        if (filters?.statusItemId) {
            profileFilter.statusItemId = filters.statusItemId;
        }

        if (
            filters?.portalId &&
            filters.filterFieldKey &&
            filters.filterValue !== undefined &&
            filters.filterValue !== ""
        ) {
            const memberDef = await this.prisma.entityDefinition.findUnique({
                where: {
                    portalId_code: {
                        portalId: filters.portalId,
                        code: ENTITY_DEFINITION_CODES.MEMBER,
                    },
                },
                select: { id: true },
            });
            if (memberDef) {
                const def = await this.prisma.fieldDefinition.findFirst({
                    where: {
                        entityDefinitionId: memberDef.id,
                        fieldKey: filters.filterFieldKey,
                        showInFilters: true,
                        isActive: true,
                    },
                    select: { id: true },
                });
                if (def) {
                    profileFilter.fieldValues = {
                        some: {
                            fieldDefinitionId: def.id,
                            valueJson: { equals: parseFilterJsonValue(filters.filterValue) },
                        },
                    };
                }
            }
        }

        if (Object.keys(profileFilter).length > 0) {
            where.profile = profileFilter;
        }

        return this.prisma.member.findMany({
            where,
            take: limit,
            skip,
            orderBy: { createdAt: "desc" },
            include: memberWithRelationsInclude,
        });
    }

    async count(): Promise<number> {
        return this.prisma.member.count();
    }

    async findById(id: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { id },
            include: memberWithRelationsInclude,
        });
    }

    async findByUserId(userId: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { userId },
            include: memberWithRelationsInclude,
        });
    }

    async create(data: {
        userId: string;
        portalId?: string;
        membershipNumber?: string;
        statusItemId?: string;
    }): Promise<MemberWithRelations> {
        const portalId = data.portalId;
        if (!portalId) {
            throw new Error("Member create requires portalId to provision EntityRecord");
        }
        return this.prisma.$transaction(async (tx) => {
            const def = await tx.entityDefinition.findUniqueOrThrow({
                where: {
                    portalId_code: {
                        portalId,
                        code: ENTITY_DEFINITION_CODES.MEMBER,
                    },
                },
            });
            const record = await tx.entityRecord.create({
                data: {
                    portalId,
                    entityDefinitionId: def.id,
                    statusItemId: data.statusItemId ?? null,
                },
            });
            return tx.member.create({
                data: {
                    userId: data.userId,
                    portalId,
                    entityRecordId: record.id,
                    membershipNumber: data.membershipNumber,
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
        }>
    ): Promise<MemberWithRelations> {
        return this.prisma.member.update({
            where: { id },
            data,
            include: memberWithRelationsInclude,
        });
    }
}
