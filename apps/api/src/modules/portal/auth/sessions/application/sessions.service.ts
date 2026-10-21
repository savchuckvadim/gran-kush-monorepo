import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import { randomUUID } from "crypto";

import { hashSecretToken } from "@common/crypto/secret-token";
import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import {
    type AnySessionAudience,
    type AppAuthSession,
    type AuthSession,
    isSessionUsable,
    PLATFORM_SESSION_AUDIENCE,
    principalTypeOf,
    REFRESH_REUSE_GRACE_MS,
    type SessionAccount,
    type SessionAudience,
    type SessionClient,
    type SessionRevokeReason,
    type SignInMethod,
} from "../domain/auth-session";
import { AuthSessionRepository } from "../domain/auth-session-repository.interface";

import { SessionTokensService } from "./session-tokens.service";

/** Машинные причины 401 на refresh: api-client по ним решает, повторять ли запрос. */
export const SESSION_ERROR_CODES = {
    /** Токен уже обновила соседняя вкладка — новые куки у браузера есть, запрос можно повторить */
    refreshSuperseded: "refresh_superseded",
    /** Сессии больше нет: истекла, отозвана или замечен повтор старого токена — нужен вход */
    sessionEnded: "session_ended",
} as const;

const SESSION_ENDED = () =>
    new UnauthorizedException({
        message: "Session has ended",
        code: SESSION_ERROR_CODES.sessionEnded,
    });

export interface StartedSession {
    sessionId: string;
    accessToken: string;
    refreshToken: string;
}

/**
 * Сессии входа (AUTH_ARCHITECTURE §3): выдача, проверка access, ротация refresh и отзыв.
 *
 * - Access проверяется вместе с сессией и аккаунтом: отозванная сессия или заблокированный аккаунт
 *   перестают работать сразу, а не когда истечёт токен.
 * - Ротация — compare-and-set по хешу. Прежний токен в окне `REFRESH_REUSE_GRACE_MS` — гонка вкладок
 *   (401 `refresh_superseded`, сессия жива); позже — повтор украденного токена: сессия гасится.
 */
@Injectable()
export class SessionsService {
    private readonly logger = new Logger(SessionsService.name);

    constructor(
        private readonly sessions: AuthSessionRepository,
        private readonly tokens: SessionTokensService
    ) {}

    async start(input: {
        userId: string;
        audience: AnySessionAudience;
        method: SignInMethod;
        client: SessionClient;
    }): Promise<StartedSession> {
        // id сессии нужен внутри токенов: он выбирается здесь, а строка пишется уже с хешем refresh
        const sessionId = randomUUID();
        const signed = await this.tokens.sign(input.userId, sessionId, input.audience);
        await this.sessions.start({
            id: sessionId,
            userId: input.userId,
            audience: input.audience,
            deviceId: input.client.deviceId,
            signInMethod: input.method,
            refreshTokenHash: signed.refreshTokenHash,
            userAgent: input.client.userAgent ?? null,
            ipAddress: input.client.ipAddress ?? null,
            expiresAt: signed.refreshExpiresAt,
        });
        return {
            sessionId,
            accessToken: signed.accessToken,
            refreshToken: signed.refreshToken,
        };
    }

    /** Access-токен → аккаунт сессии; `null` — токен не годится, сессии или аккаунта больше нет. */
    async authenticate(
        accessToken: string,
        audience: SessionAudience
    ): Promise<AuthenticatedUser | null> {
        const live = await this.liveSession(accessToken, audience);
        if (!live) return null;
        const { session, account, expiresAt } = live;
        return {
            kind: "authenticated_user",
            userId: account.id,
            email: account.email,
            principalType: principalTypeOf(audience),
            emailConfirmed: account.emailConfirmed,
            isActive: account.isActive,
            sessionId: session.id,
            audience,
            accessExpiresAt: expiresAt ?? undefined,
        };
    }

    /** Access админки платформы → аккаунт и сессия; права админа проверяет гвард платформы. */
    async authenticatePlatform(
        accessToken: string
    ): Promise<{ userId: string; sessionId: string } | null> {
        const live = await this.liveSession(accessToken, PLATFORM_SESSION_AUDIENCE);
        return live ? { userId: live.account.id, sessionId: live.session.id } : null;
    }

    async refresh(refreshToken: string, audience: AnySessionAudience): Promise<StartedSession> {
        const verified = await this.tokens.verifyRefresh(refreshToken, audience);
        if (!verified) throw SESSION_ENDED();
        const found = await this.sessions.findWithAccount(verified.sessionId);
        if (!found) throw SESSION_ENDED();

        const { session, account } = found;
        const now = new Date();
        if (session.userId !== verified.userId || !isSessionUsable(session, now)) {
            throw SESSION_ENDED();
        }
        if (account.blocked || !account.isActive) {
            await this.sessions.revoke(session.id, "blocked");
            throw SESSION_ENDED();
        }

        const presented = hashSecretToken(refreshToken);
        if (presented !== session.refreshTokenHash) {
            throw await this.staleToken(session, presented, now);
        }

        const signed = await this.tokens.sign(account.id, session.id, audience);
        const rotated = await this.sessions.rotate(session.id, presented, {
            refreshTokenHash: signed.refreshTokenHash,
            expiresAt: signed.refreshExpiresAt,
            at: now,
        });
        if (!rotated) {
            // ротацию только что выиграл параллельный запрос с тем же токеном
            throw new UnauthorizedException({
                message: "Refresh token was already used",
                code: SESSION_ERROR_CODES.refreshSuperseded,
            });
        }
        return {
            sessionId: session.id,
            accessToken: signed.accessToken,
            refreshToken: signed.refreshToken,
        };
    }

    /** Выход по refresh-токену; чужой или негодный токен выход не ломает. */
    async endByRefreshToken(refreshToken: string, audience: AnySessionAudience): Promise<void> {
        const verified = await this.tokens.verifyRefresh(refreshToken, audience);
        if (verified) await this.sessions.revoke(verified.sessionId, "logout");
    }

    async end(sessionId: string, reason: SessionRevokeReason): Promise<void> {
        await this.sessions.revoke(sessionId, reason);
    }

    /** Все сессии аккаунта во всех аудиториях; `exceptSessionId` — текущая, если её оставляем. */
    endAllForUser(
        userId: string,
        reason: SessionRevokeReason,
        exceptSessionId?: string
    ): Promise<number> {
        return this.sessions.revokeAllForUser(userId, reason, exceptSessionId);
    }

    /** Устройство из списка «Вход и безопасность»; `false` — не своя или уже закрытая сессия. */
    endOwned(userId: string, sessionId: string): Promise<boolean> {
        return this.sessions.revokeOwned(sessionId, userId, "revoked_by_user");
    }

    listForUser(userId: string): Promise<AppAuthSession[]> {
        return this.sessions.listActiveForUser(userId, new Date());
    }

    /** Живая сессия аудитории и её аккаунт; `null` — токен не годится, сессии или аккаунта нет. */
    private async liveSession(
        accessToken: string,
        audience: AnySessionAudience
    ): Promise<{ session: AuthSession; account: SessionAccount; expiresAt: Date | null } | null> {
        const verified = await this.tokens.verifyAccess(accessToken, audience);
        if (!verified) return null;
        const found = await this.sessions.findWithAccount(verified.sessionId);
        if (!found) return null;
        const { session, account } = found;
        if (
            session.userId !== verified.userId ||
            session.audience !== audience ||
            !isSessionUsable(session, new Date()) ||
            account.blocked ||
            !account.isActive
        ) {
            return null;
        }
        return { session, account, expiresAt: verified.expiresAt };
    }

    private async staleToken(
        session: AuthSession & { previousTokenHash: string | null; rotatedAt: Date | null },
        presented: string,
        now: Date
    ): Promise<UnauthorizedException> {
        const withinGrace =
            presented === session.previousTokenHash &&
            session.rotatedAt !== null &&
            now.getTime() - session.rotatedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
        if (withinGrace) {
            return new UnauthorizedException({
                message: "Refresh token was already used",
                code: SESSION_ERROR_CODES.refreshSuperseded,
            });
        }
        this.logger.warn(
            `Refresh token reuse: session ${session.id} of user ${session.userId} revoked`
        );
        await this.sessions.revoke(session.id, "reuse_detected");
        return SESSION_ENDED();
    }
}
