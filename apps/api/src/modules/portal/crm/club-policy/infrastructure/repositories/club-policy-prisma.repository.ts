import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { ClubPolicyRules, DEFAULT_CLUB_POLICY } from "../../domain/club-policy";
import {
    ClubPolicyRepository,
    MemberShopContext,
} from "../../domain/repositories/club-policy-repository.interface";

const RULES_SELECT = {
    joinPolicy: true,
    catalogOutsideClub: true,
    ordersRequireApproval: true,
    staffSelfOrders: true,
    monthlyLimitEnabled: true,
    defaultMonthlyLimitGrams: true,
} as const;

type RulesRow = Prisma.ClubPolicyGetPayload<{ select: typeof RULES_SELECT }>;

const toRules = (row: RulesRow): ClubPolicyRules => ({
    ...row,
    defaultMonthlyLimitGrams:
        row.defaultMonthlyLimitGrams === null ? null : Number(row.defaultMonthlyLimitGrams),
});

@Injectable()
export class ClubPolicyPrismaRepository implements ClubPolicyRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findRules(portalId: string): Promise<ClubPolicyRules | null> {
        const row = await this.prisma.clubPolicy.findUnique({
            where: { portalId },
            select: RULES_SELECT,
        });
        return row ? toRules(row) : null;
    }

    async saveRules(portalId: string, rules: ClubPolicyRules): Promise<ClubPolicyRules> {
        const row = await this.prisma.clubPolicy.upsert({
            where: { portalId },
            create: { portalId, ...rules },
            update: rules,
            select: RULES_SELECT,
        });
        return toRules(row);
    }

    async findMemberLimit(
        memberId: string,
        portalId: string
    ): Promise<{ rules: ClubPolicyRules; personalGrams: number | null } | null> {
        const member = await this.prisma.member.findFirst({
            where: { id: memberId, portalId },
            select: {
                monthlyLimitGrams: true,
                portal: { select: { policy: { select: RULES_SELECT } } },
            },
        });
        if (!member) return null;
        return {
            rules: member.portal.policy ? toRules(member.portal.policy) : DEFAULT_CLUB_POLICY,
            personalGrams:
                member.monthlyLimitGrams === null ? null : Number(member.monthlyLimitGrams),
        };
    }

    async saveMemberLimit(
        memberId: string,
        portalId: string,
        grams: number | null
    ): Promise<boolean> {
        const { count } = await this.prisma.member.updateMany({
            where: { id: memberId, portalId },
            data: { monthlyLimitGrams: grams },
        });
        return count > 0;
    }

    async findMemberUserId(memberId: string, portalId: string): Promise<string | null> {
        const member = await this.prisma.member.findFirst({
            where: { id: memberId, portalId },
            select: { userId: true },
        });
        return member?.userId ?? null;
    }

    async findTickedMemberFlags(
        memberId: string,
        portalId: string,
        fieldKeys: readonly string[]
    ): Promise<string[]> {
        const rows = await this.prisma.fieldValue.findMany({
            where: {
                portalId,
                entityRecord: { member: { id: memberId } },
                fieldDefinition: { fieldKey: { in: [...fieldKeys] } },
                valueJson: { equals: true },
            },
            select: { fieldDefinition: { select: { fieldKey: true } } },
        });
        return rows.map((row) => row.fieldDefinition.fieldKey);
    }

    /** The member, its status, an open visit, the club's rules and subscription — one query. */
    async loadShopContext(memberId: string, portalId: string): Promise<MemberShopContext | null> {
        const member = await this.prisma.member.findFirst({
            where: { id: memberId, portalId },
            select: {
                profile: {
                    select: {
                        statusItem: { select: { key: true } },
                        presenceSessions: {
                            where: { exitedAt: null },
                            select: { id: true },
                            take: 1,
                        },
                    },
                },
                portal: {
                    select: {
                        policy: { select: RULES_SELECT },
                        subscription: { select: { status: true, graceEndsAt: true } },
                    },
                },
            },
        });
        if (!member) return null;
        return {
            rules: member.portal.policy ? toRules(member.portal.policy) : DEFAULT_CLUB_POLICY,
            statusKey: member.profile.statusItem?.key ?? null,
            inClub: member.profile.presenceSessions.length > 0,
            subscription: member.portal.subscription,
        };
    }
}
