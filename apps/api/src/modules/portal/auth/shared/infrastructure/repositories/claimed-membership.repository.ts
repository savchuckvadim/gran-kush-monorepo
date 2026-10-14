import { Injectable } from "@nestjs/common";

import { MemberConsentStatus, MemberJoinSource } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import { ClaimedMembershipRepository } from "../../domain/repositories/claimed-membership-repository.interface";

@Injectable()
export class ClaimedMembershipPrismaRepository implements ClaimedMembershipRepository {
    constructor(private readonly prisma: PrismaService) {}

    async confirmPendingSelfJoins(userId: string): Promise<number> {
        // Документы при этом НЕ расшариваются: клуб видит только анкету из формы
        // регистрации и то, что загрузит сам (TASK-664 держится и после клейма)
        const result = await this.prisma.member.updateMany({
            where: {
                userId,
                consentStatus: MemberConsentStatus.pending,
                joinSource: { not: MemberJoinSource.crm },
            },
            data: {
                consentStatus: MemberConsentStatus.confirmed,
                consentToken: null,
                consentConfirmedAt: new Date(),
            },
        });
        return result.count;
    }
}
