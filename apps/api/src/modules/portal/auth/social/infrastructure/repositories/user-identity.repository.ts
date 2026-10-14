import { Injectable } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    LinkIdentityInput,
    UserIdentityRepository,
} from "@modules/portal/auth/social/domain/repositories/user-identity-repository.interface";

@Injectable()
export class UserIdentityPrismaRepository extends UserIdentityRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findUserIdByProvider(provider: string, providerUserId: string): Promise<string | null> {
        const identity = await this.prisma.userIdentity.findUnique({
            where: { provider_providerUserId: { provider, providerUserId } },
            select: { userId: true },
        });
        return identity?.userId ?? null;
    }

    async link(input: LinkIdentityInput): Promise<void> {
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
                email: input.email ?? null,
                displayName: input.displayName ?? null,
            },
            update: {
                userId: input.userId,
                email: input.email ?? null,
                displayName: input.displayName ?? null,
            },
        });
    }
}
