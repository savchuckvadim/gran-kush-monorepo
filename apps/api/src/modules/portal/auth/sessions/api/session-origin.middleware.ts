import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { NextFunction, Request, Response } from "express";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";

import { SESSION_COOKIE_NAMES } from "./session-cookies.service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CORS_ORIGIN_ENV = "CORS_ORIGIN";
export const ORIGIN_NOT_ALLOWED = "origin_not_allowed";

const SESSION_COOKIES = Object.values(SESSION_COOKIE_NAMES).flatMap((names) => [
    names.access,
    names.refresh,
]);

const originOf = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

/**
 * Защита от подделки запроса (CSRF) для входа на куках (AUTH_ARCHITECTURE §3.4). `SameSite=Lax`
 * не спасает от соседних поддоменов: `paf-paf.app` и `crm.paf-paf.app` — один «сайт», и форма
 * с любого поддомена ушла бы на API с куками сессии. Поэтому изменяющий запрос с кукой сессии
 * принимается только с наших фронтов (`CORS_ORIGIN`) или с самого API; источник берётся из
 * `Origin`, без него — из `Referer`.
 *
 * Запрос без кук сессии (Bearer, вебхуки, сервер-сервер) не проверяется: подделать в нём нечего.
 */
@Injectable()
export class SessionOriginMiddleware implements NestMiddleware {
    private readonly allowed: Set<string>;

    constructor(config: ConfigService, urls: PublicUrlsService) {
        const fronts = (config.get<string>(CORS_ORIGIN_ENV) ?? "")
            .split(",")
            .map((origin) => originOf(origin.trim()))
            .filter((origin): origin is string => origin !== null);
        this.allowed = new Set(
            [...fronts, originOf(urls.api)].filter((origin): origin is string => origin !== null)
        );
    }

    use(request: Request, _response: Response, next: NextFunction): void {
        if (SAFE_METHODS.has(request.method) || !this.carriesSession(request)) {
            next();
            return;
        }
        const origin = request.headers.origin ?? originOf(request.headers.referer) ?? undefined;
        if (origin !== undefined && !this.allowed.has(origin)) {
            throw new ForbiddenException({
                message: "Request origin is not allowed",
                code: ORIGIN_NOT_ALLOWED,
            });
        }
        next();
    }

    private carriesSession(request: Request): boolean {
        const cookies = request.cookies as Record<string, string> | undefined;
        return SESSION_COOKIES.some((name) => Boolean(cookies?.[name]));
    }
}
