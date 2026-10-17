import { Injectable } from "@nestjs/common";

import { hashSecretToken, issueSecretToken } from "@common/crypto/secret-token";

import {
    AUTH_TOKEN_TTL_MS,
    type AuthTokenPurpose,
    type AuthTokenSubject,
    type ConsumeAuthTokenResult,
} from "../domain/auth-token";
import { AuthTokenRepository } from "../domain/auth-token-repository.interface";

/**
 * Одноразовые ссылки из писем (TASK-736): подтверждение почты, сброс и первый пароль, шаг почты
 * после Telegram. Гарантии:
 * - в БД лежит только SHA-256 токена — утечка таблицы не даёт рабочих ссылок;
 * - ссылка работает один раз, даже при двух одновременных запросах;
 * - новая ссылка того же назначения гасит прежние: работает последнее письмо.
 */
@Injectable()
export class AuthTokensService {
    constructor(private readonly tokens: AuthTokenRepository) {}

    /** Выдаёт ссылку и возвращает сам токен — он уходит только в письмо. */
    async issue(
        purpose: AuthTokenPurpose,
        subject: AuthTokenSubject,
        payload?: object
    ): Promise<{ token: string; expiresAt: Date }> {
        const { token, hash } = issueSecretToken();
        const expiresAt = new Date(Date.now() + AUTH_TOKEN_TTL_MS[purpose]);
        await this.tokens.issue({ purpose, subject, tokenHash: hash, payload, expiresAt });
        return { token, expiresAt };
    }

    consume(
        purposes: AuthTokenPurpose | AuthTokenPurpose[],
        token: string
    ): Promise<ConsumeAuthTokenResult> {
        const accepted = Array.isArray(purposes) ? purposes : [purposes];
        return this.tokens.consume(accepted, hashSecretToken(token), new Date());
    }

    revokeForUser(userId: string, purposes: AuthTokenPurpose[]): Promise<void> {
        return this.tokens.revokeForUser(userId, purposes);
    }
}
