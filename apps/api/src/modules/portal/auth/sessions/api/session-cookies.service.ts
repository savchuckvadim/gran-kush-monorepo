import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { CookieOptions, Request, Response } from "express";

import { SessionTokensService } from "../application/session-tokens.service";
import type { SessionAudience } from "../domain/auth-session";

import { isAuthCookieSecure } from "./auth-cookie-security";

/** Домен куки-подсказки «есть сессия» для proxy фронтов (`.paf-paf.app`); пусто — только хост API */
const AUTH_HINT_COOKIE_DOMAIN_ENV = "AUTH_HINT_COOKIE_DOMAIN";
const HINT_VALUE = "1";

/** Имена кук по аудиториям. Прежние `*_access_token` не переиспользуются: старые куки на домене просто истекут. */
export const SESSION_COOKIE_NAMES: Record<
    SessionAudience,
    { access: string; refresh: string; hint: string }
> = {
    crm: { access: "crm_access", refresh: "crm_refresh", hint: "crm_session" },
    cabinet: { access: "cabinet_access", refresh: "cabinet_refresh", hint: "cabinet_session" },
};

/** refresh и logout аудитории живут под `/{aud}/auth` — только туда браузер и шлёт refresh-куку. */
const refreshPath = (audience: SessionAudience): string => `/${audience}/auth`;

/**
 * Куки сессии (AUTH_ARCHITECTURE §3.4). Токены — host-only куки API: на сайт и другие поддомены они
 * не уходят. Фронтам для proxy достаточно подсказки `{aud}_session=1` на общем домене; сессию
 * всё равно проверяет API на каждом запросе.
 */
@Injectable()
export class SessionCookiesService {
    private readonly secure: boolean;
    private readonly hintDomain: string | undefined;

    constructor(
        config: ConfigService,
        private readonly tokens: SessionTokensService
    ) {
        this.secure = isAuthCookieSecure(config);
        this.hintDomain = config.get<string>(AUTH_HINT_COOKIE_DOMAIN_ENV) || undefined;
    }

    readAccess(request: Request, audience: SessionAudience): string | null {
        return this.read(request, SESSION_COOKIE_NAMES[audience].access);
    }

    readRefresh(request: Request, audience: SessionAudience): string | null {
        return this.read(request, SESSION_COOKIE_NAMES[audience].refresh);
    }

    write(
        response: Response,
        audience: SessionAudience,
        tokens: { accessToken: string; refreshToken: string }
    ): void {
        const names = SESSION_COOKIE_NAMES[audience];
        response.cookie(
            names.access,
            tokens.accessToken,
            this.options("/", this.tokens.accessTtlMs)
        );
        response.cookie(
            names.refresh,
            tokens.refreshToken,
            this.options(refreshPath(audience), this.tokens.refreshTtlMs)
        );
        response.cookie(names.hint, HINT_VALUE, {
            ...this.options("/", this.tokens.refreshTtlMs),
            domain: this.hintDomain,
        });
    }

    clear(response: Response, audience: SessionAudience): void {
        const names = SESSION_COOKIE_NAMES[audience];
        response.clearCookie(names.access, this.options("/"));
        response.clearCookie(names.refresh, this.options(refreshPath(audience)));
        response.clearCookie(names.hint, { ...this.options("/"), domain: this.hintDomain });
    }

    private options(path: string, maxAge?: number): CookieOptions {
        return { httpOnly: true, secure: this.secure, sameSite: "lax", path, maxAge };
    }

    private read(request: Request, name: string): string | null {
        const value = (request.cookies as Record<string, unknown> | undefined)?.[name];
        return typeof value === "string" && value.length > 0 ? value : null;
    }
}
