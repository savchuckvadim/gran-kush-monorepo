import { Prisma, Token } from "@prisma/client";

export type TokenWithUserAndMember = Prisma.TokenGetPayload<{
    include: { user: { include: { member: true } } };
}>;

export abstract class TokenRepository {
    abstract create(data: {
        token: string;
        userId: string;
        portalId?: string;
        expiresAt: Date;
    }): Promise<Token>;
    abstract findByToken(token: string): Promise<TokenWithUserAndMember | null>;
    abstract findByUserId(userId: string): Promise<Token[]>;
    abstract deleteByToken(token: string): Promise<{ count: number }>;
    abstract deleteByUserId(userId: string): Promise<{ count: number }>;
    abstract deleteExpired(): Promise<{ count: number }>;
}
