import type { ConfigService } from "@nestjs/config";

import type { PublicUrlsService } from "@common/config/public-urls/public-urls.service";

import type { SessionAudience } from "../domain/auth-session";

const CORS_ORIGIN_ENV = "CORS_ORIGIN";

export const originOf = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        return new URL(url).origin;
    } catch {
        return null;
    }
};

/**
 * Откуда принимаются запросы с кукой сессии: наши фронты (`CORS_ORIGIN`) и сам API. Один список
 * для защиты от подделки HTTP-запросов (SessionOriginMiddleware) и для рукопожатия realtime:
 * чужая страница не откроет сокет с куками человека.
 */
export const allowedOrigins = (config: ConfigService, urls: PublicUrlsService): Set<string> => {
    const fronts = (config.get<string>(CORS_ORIGIN_ENV) ?? "")
        .split(",")
        .map((origin) => originOf(origin.trim()))
        .filter((origin): origin is string => origin !== null);
    return new Set(
        [...fronts, originOf(urls.api)].filter((origin): origin is string => origin !== null)
    );
};

/**
 * Откуда открывать сокет приложения на его куке: только с фронта этого приложения (CRM — с
 * `CRM_FRONTEND_URL`, кабинет — с `MEMBER_FRONTEND_URL`) и с самого API. Куки обоих приложений
 * лежат в браузере рядом, и страница кабинета не должна слушать CRM того же человека.
 */
export const audienceOrigins = (urls: PublicUrlsService, audience: SessionAudience): Set<string> =>
    new Set(
        [originOf(urls[audience]), originOf(urls.api)].filter(
            (origin): origin is string => origin !== null
        )
    );
