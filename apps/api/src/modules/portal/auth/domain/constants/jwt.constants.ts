/**
 * JWT константы для переменных окружения и значений по умолчанию
 */
export const JWT_ENV_KEYS = {
    SECRET: "JWT_SECRET",
    REFRESH_SECRET: "JWT_REFRESH_SECRET",
    ACCESS_TOKEN_EXPIRES_IN: "JWT_ACCESS_TOKEN_EXPIRES_IN",
    REFRESH_TOKEN_EXPIRES_IN: "JWT_REFRESH_TOKEN_EXPIRES_IN",
} as const;

/**
 * Значения по умолчанию для JWT. Секрета среди них нет сознательно:
 * JWT_SECRET обязан приходить из окружения, иначе приложение не стартует.
 */
export const JWT_DEFAULTS = {
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
} as const;
