import { Injectable, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import {
    PLATFORM_SESSION_AUDIENCE,
    type SessionClient,
} from "@modules/portal/auth/sessions/domain/auth-session";
import { PasswordSignInService } from "@modules/portal/auth/shared/application/services/password-sign-in.service";

export interface PlatformSessionTokens {
    accessToken: string;
    refreshToken: string;
}

export interface PlatformSignIn extends PlatformSessionTokens {
    admin: { id: string; role: string; email: string };
}

/**
 * Вход в админку платформы. Каждый вход — строка `auth_sessions` с аудиторией `platform`: выход,
 * смена или сброс пароля и блокировка аккаунта гасят её сразу, а не когда истечёт токен. Токены
 * отдаются в теле: их держит в HttpOnly-куках сервер админки, браузер их не видит. Админом считается
 * активный `PlatformAdmin` активного аккаунта — это проверяется при входе и на каждый запрос
 * (`PlatformJwtAuthGuard`).
 */
@Injectable()
export class PlatformAuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly sessions: SessionsService,
        private readonly passwords: PasswordSignInService
    ) {}

    async login(email: string, password: string, client: SessionClient): Promise<PlatformSignIn> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            include: { platformAdmin: true },
        });

        // Пароль проверяется у любого адреса — одно время ответа и общий лимит неудач (TASK-667)
        await this.passwords.verify(email, password, user?.passwordHash ?? null);
        if (!user?.platformAdmin || !user.isActive || !user.platformAdmin.isActive) {
            throw new UnauthorizedException("Invalid credentials");
        }

        const session = await this.sessions.start({
            userId: user.id,
            audience: PLATFORM_SESSION_AUDIENCE,
            method: "password",
            client,
        });

        return {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            admin: {
                id: user.platformAdmin.id,
                role: user.platformAdmin.role,
                email: user.email,
            },
        };
    }

    async refresh(refreshToken: string): Promise<PlatformSessionTokens> {
        const session = await this.sessions.refresh(refreshToken, PLATFORM_SESSION_AUDIENCE);
        return { accessToken: session.accessToken, refreshToken: session.refreshToken };
    }

    logout(refreshToken: string): Promise<void> {
        return this.sessions.endByRefreshToken(refreshToken, PLATFORM_SESSION_AUDIENCE);
    }
}
