/**
 * Mail module constants
 * All magic strings and configuration values for mail module
 */

/**
 * Default email sender
 */
export const DEFAULT_EMAIL_FROM = "manager@april-app.ru";

/**
 * Default email sender name
 */
export const DEFAULT_EMAIL_FROM_NAME = "App";

/**
 * Email subjects by language and type
 */
export const EMAIL_SUBJECTS = {
    VERIFICATION: {
        ru: "Верификация почты",
        es: "Verificación de correo",
        en: "Email Verification",
    },
    PASSWORD_RESET: {
        ru: "Сброс пароля",
        es: "Restablecer contraseña",
        en: "Password Reset",
    },
} as const;

/**
 * Supported languages
 */
export type SupportedLanguage = "ru" | "es" | "en";

/**
 * Default language
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * Job options defaults
 */
export const JOB_OPTIONS = {
    REMOVE_ON_COMPLETE: true,
    REMOVE_ON_FAIL: false,
} as const;
