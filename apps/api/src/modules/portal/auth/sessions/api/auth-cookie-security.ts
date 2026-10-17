import type { ConfigService } from "@nestjs/config";

const AUTH_COOKIE_SECURE_ENV = "AUTH_COOKIE_SECURE";
const NODE_ENV = "NODE_ENV";
const PRODUCTION = "production";

/**
 * `Secure` у кук входа (сессии, привязка OAuth): по `AUTH_COOKIE_SECURE`, а без него — в проде.
 * Одно правило для всех кук входа: иначе кука привязки уехала бы по http, а сессия — нет.
 */
export const isAuthCookieSecure = (config: ConfigService): boolean => {
    const flag = config.get<string>(AUTH_COOKIE_SECURE_ENV);
    return flag === undefined ? config.get<string>(NODE_ENV) === PRODUCTION : flag === "true";
};
