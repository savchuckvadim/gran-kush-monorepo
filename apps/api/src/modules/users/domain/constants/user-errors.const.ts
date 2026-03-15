/**
 * Константы ошибок для модуля пользователей
 */
export const USER_ERRORS = {
    NOT_FOUND: "User not found",
    ALREADY_EXISTS: "User with this email already exists",
    INVALID_EMAIL: "Invalid email format",
    INVALID_PASSWORD: "Password must be at least 8 characters",
    INVALID_NAME: "Name must be at least 2 characters",
    INVALID_PHONE: "Invalid phone number format",
} as const;
