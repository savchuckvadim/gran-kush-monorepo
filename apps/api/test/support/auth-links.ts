import { PrismaService } from "../../src/common/prisma/prisma.service";
import {
    AUTH_TOKEN_PURPOSES,
    type AuthTokenPurpose,
} from "../../src/modules/portal/auth/tokens/domain/auth-token";

const PAST_MS = 60_000;
const FUTURE_MS = 60 * 60_000;

export const LINKS = {
    emailVerification: [AUTH_TOKEN_PURPOSES.EmailVerification],
    /** Форма пароля: сброс и первый пароль аккаунта, заведённого клубом */
    password: [AUTH_TOKEN_PURPOSES.PasswordReset, AUTH_TOKEN_PURPOSES.AccountSetup],
} satisfies Record<string, AuthTokenPurpose[]>;

/**
 * Ссылки из писем в `auth_tokens` (TASK-736). В БД — только хеш, поэтому тест берёт хеш последней
 * живой ссылки адреса, а сам токен — из отправленного письма (`mailTokens(...).fromHash`).
 */
export const authLinks = (prisma: PrismaService) => {
    const live = (email: string, purposes: AuthTokenPurpose[]) => ({
        user: { email },
        purpose: { in: purposes },
        consumedAt: null,
    });

    return {
        /** Хеш последней непогашенной ссылки или `null`, если ссылки нет. */
        latestHash: async (email: string, purposes: AuthTokenPurpose[]): Promise<string | null> => {
            const row = await prisma.authToken.findFirst({
                where: live(email, purposes),
                orderBy: { createdAt: "desc" },
                select: { tokenHash: true },
            });
            return row?.tokenHash ?? null;
        },
        expire: (email: string, purposes: AuthTokenPurpose[]) =>
            prisma.authToken.updateMany({
                where: live(email, purposes),
                data: { expiresAt: new Date(Date.now() - PAST_MS) },
            }),
        renew: (email: string, purposes: AuthTokenPurpose[]) =>
            prisma.authToken.updateMany({
                where: live(email, purposes),
                data: { expiresAt: new Date(Date.now() + FUTURE_MS) },
            }),
        clear: (email: string) => prisma.authToken.deleteMany({ where: { user: { email } } }),
    };
};
