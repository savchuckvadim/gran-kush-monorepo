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
 * Значения по умолчанию для JWT
 */
export const JWT_DEFAULTS = {
    SECRET: "default-secret",
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN: "7d",
} as const;

/**
 * Сообщения об ошибках JWT
 */
export const JWT_ERROR_MESSAGES = {
    SECRET_NOT_CONFIGURED: "JWT_SECRET is not configured",
} as const;
