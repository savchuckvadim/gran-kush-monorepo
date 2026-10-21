import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";

import { randomUUID } from "crypto";

import { hashSecretToken } from "@common/crypto/secret-token";
import { parseDurationToMs } from "@common/time/duration.util";
import { JWT_DEFAULTS, JWT_ENV_KEYS } from "@modules/portal/auth/domain/constants/jwt.constants";

import type { AnySessionAudience } from "../domain/auth-session";

const TOKEN_TYPES = { Access: "access", Refresh: "refresh" } as const;
type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

/** Что несёт JWT сессии: аккаунт, сессия, аудитория и тип токена. */
interface SessionJwtPayload {
    sub: string;
    sid: string;
    typ: TokenType;
}

export interface SessionTokens {
    accessToken: string;
    refreshToken: string;
    refreshTokenHash: string;
    refreshExpiresAt: Date;
}

export interface VerifiedSessionToken {
    userId: string;
    sessionId: string;
    /** Когда токен истекает (`exp`): realtime-соединение закрывается в этот момент */
    expiresAt: Date | null;
}

const DEFAULT_ACCESS_TTL_MS = 15 * 60_000;
const DEFAULT_REFRESH_TTL_MS = 7 * 86_400_000;

/**
 * Подпись и проверка JWT сессии. Access `{ sub, sid, typ: access }` и refresh `{ sub, sid, typ: refresh }`
 * подписаны разными секретами, аудитория — стандартный claim `aud`. Секреты обязательны: без них
 * приложение не стартует (раньше refresh молча подписывался секретом access).
 */
@Injectable()
export class SessionTokensService {
    private readonly accessSecret: string;
    private readonly refreshSecret: string;
    private readonly accessTtl: string;
    private readonly refreshTtl: string;

    constructor(
        private readonly jwt: JwtService,
        config: ConfigService
    ) {
        this.accessSecret = config.getOrThrow<string>(JWT_ENV_KEYS.SECRET);
        this.refreshSecret = config.getOrThrow<string>(JWT_ENV_KEYS.REFRESH_SECRET);
        this.accessTtl =
            config.get<string>(JWT_ENV_KEYS.ACCESS_TOKEN_EXPIRES_IN) ??
            JWT_DEFAULTS.ACCESS_TOKEN_EXPIRES_IN;
        this.refreshTtl =
            config.get<string>(JWT_ENV_KEYS.REFRESH_TOKEN_EXPIRES_IN) ??
            JWT_DEFAULTS.REFRESH_TOKEN_EXPIRES_IN;
    }

    /** Срок refresh-куки и строки сессии — тот же, что у самого JWT. */
    get refreshTtlMs(): number {
        return parseDurationToMs(this.refreshTtl, DEFAULT_REFRESH_TTL_MS);
    }

    get accessTtlMs(): number {
        return parseDurationToMs(this.accessTtl, DEFAULT_ACCESS_TTL_MS);
    }

    async sign(
        userId: string,
        sessionId: string,
        audience: AnySessionAudience
    ): Promise<SessionTokens> {
        const [accessToken, refreshToken] = await Promise.all([
            this.signOne({ sub: userId, sid: sessionId, typ: TOKEN_TYPES.Access }, audience, {
                secret: this.accessSecret,
                expiresIn: this.accessTtl as JwtSignOptions["expiresIn"],
            }),
            this.signOne({ sub: userId, sid: sessionId, typ: TOKEN_TYPES.Refresh }, audience, {
                secret: this.refreshSecret,
                expiresIn: this.refreshTtl as JwtSignOptions["expiresIn"],
            }),
        ]);
        return {
            accessToken,
            refreshToken,
            refreshTokenHash: hashSecretToken(refreshToken),
            refreshExpiresAt: new Date(Date.now() + this.refreshTtlMs),
        };
    }

    verifyAccess(
        token: string,
        audience: AnySessionAudience
    ): Promise<VerifiedSessionToken | null> {
        return this.verify(token, audience, TOKEN_TYPES.Access, this.accessSecret);
    }

    verifyRefresh(
        token: string,
        audience: AnySessionAudience
    ): Promise<VerifiedSessionToken | null> {
        return this.verify(token, audience, TOKEN_TYPES.Refresh, this.refreshSecret);
    }

    private signOne(
        payload: SessionJwtPayload,
        audience: AnySessionAudience,
        options: Pick<JwtSignOptions, "secret" | "expiresIn">
    ): Promise<string> {
        // jwtid: две пары одной сессии за одну секунду иначе совпали бы байт в байт
        return this.jwt.signAsync({ ...payload }, { ...options, audience, jwtid: randomUUID() });
    }

    private async verify(
        token: string,
        audience: AnySessionAudience,
        type: TokenType,
        secret: string
    ): Promise<VerifiedSessionToken | null> {
        try {
            const payload = await this.jwt.verifyAsync<
                Partial<SessionJwtPayload> & { exp?: number }
            >(token, { secret, audience });
            if (payload.typ !== type || !payload.sub || !payload.sid) return null;
            return {
                userId: payload.sub,
                sessionId: payload.sid,
                expiresAt: typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null,
            };
        } catch {
            return null;
        }
    }
}
