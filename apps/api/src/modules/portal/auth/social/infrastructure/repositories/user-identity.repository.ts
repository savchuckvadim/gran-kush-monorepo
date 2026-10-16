import { Injectable } from "@nestjs/common";

import type { IdentityProvider } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    LinkedIdentity,
    LinkIdentityInput,
    UserIdentityRepository,
} from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";

@Injectable()
export class UserIdentityPrismaRepository extends UserIdentityRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findUserIdByProvider(
        provider: IdentityProvider,
        providerUserId: string
    ): Promise<string | null> {
        const identity = await this.prisma.userIdentity.findUnique({
            where: { provider_providerUserId: { provider, providerUserId } },
            select: { userId: true },
        });
        return identity?.userId ?? null;
    }

    async link(input: LinkIdentityInput): Promise<void> {
        const profile = {
            email: input.email ?? null,
            emailVerified: input.emailVerified ?? false,
            displayName: input.displayName ?? null,
            givenName: input.givenName ?? null,
            familyName: input.familyName ?? null,
            username: input.username ?? null,
            locale: input.locale ?? null,
            lastLoginAt: new Date(),
        };
        await this.prisma.userIdentity.upsert({
            where: {
                provider_providerUserId: {
                    provider: input.provider,
                    providerUserId: input.providerUserId,
                },
            },
            create: {
                userId: input.userId,
                provider: input.provider,
                providerUserId: input.providerUserId,
                ...profile,
            },
            update: { userId: input.userId, ...profile },
        });
    }

    async findForUser(userId: string, provider: IdentityProvider): Promise<LinkedIdentity | null> {
        return this.prisma.userIdentity.findFirst({
            where: { userId, provider },
            select: { providerUserId: true, email: true, username: true },
            orderBy: { createdAt: "asc" },
        });
    }

    async unlink(userId: string, provider: IdentityProvider): Promise<number> {
        const { count } = await this.prisma.userIdentity.deleteMany({
            where: { userId, provider },
        });
        return count;
    }
}
