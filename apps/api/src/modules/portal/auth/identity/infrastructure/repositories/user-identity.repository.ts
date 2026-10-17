import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";

import type { IdentityProviderKey } from "../../domain/identity-provider";
import {
    type LinkedIdentity,
    type LinkIdentityInput,
    UserIdentityRepository,
} from "../../domain/repositories/user-identity-repository.interface";

const LINKED_SELECT = {
    provider: true,
    providerUserId: true,
    email: true,
    username: true,
} as const;

@Injectable()
export class UserIdentityPrismaRepository extends UserIdentityRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findUserIdByProvider(
        provider: IdentityProviderKey,
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

    findForUser(userId: string, provider: IdentityProviderKey): Promise<LinkedIdentity | null> {
        return this.prisma.userIdentity.findUnique({
            where: { userId_provider: { userId, provider } },
            select: LINKED_SELECT,
        });
    }

    listForUser(userId: string): Promise<LinkedIdentity[]> {
        return this.prisma.userIdentity.findMany({
            where: { userId },
            select: LINKED_SELECT,
            orderBy: { createdAt: "asc" },
        });
    }

    async unlink(userId: string, provider: IdentityProviderKey): Promise<number> {
        const { count } = await this.prisma.userIdentity.deleteMany({
            where: { userId, provider },
        });
        return count;
    }
}
