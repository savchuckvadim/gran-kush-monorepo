import { Injectable } from "@nestjs/common";

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
} as const;

@Injectable()
export class ClubPolicyPrismaRepository implements ClubPolicyRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findRules(portalId: string): Promise<ClubPolicyRules | null> {
        return this.prisma.clubPolicy.findUnique({ where: { portalId }, select: RULES_SELECT });
    }

    async saveRules(portalId: string, rules: ClubPolicyRules): Promise<ClubPolicyRules> {
        return this.prisma.clubPolicy.upsert({
            where: { portalId },
            create: { portalId, ...rules },
            update: rules,
            select: RULES_SELECT,
        });
    }

    async findMemberUserId(memberId: string, portalId: string): Promise<string | null> {
        const member = await this.prisma.member.findFirst({
            where: { id: memberId, portalId },
            select: { userId: true },
        });
        return member?.userId ?? null;
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
            rules: member.portal.policy ?? DEFAULT_CLUB_POLICY,
            statusKey: member.profile.statusItem?.key ?? null,
            inClub: member.profile.presenceSessions.length > 0,
            subscription: member.portal.subscription,
        };
    }
}
