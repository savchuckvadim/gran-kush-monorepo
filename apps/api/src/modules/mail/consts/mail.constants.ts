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
 * Product name in email texts — until the shared brand package (TASK-531) exists
 */
export const MAIL_BRAND_NAME = "PafPaf";

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
    PORTAL_REGISTRATION: {
        ru: "Регистрация портала в CRM",
        es: "Registro del portal en CRM",
        en: "Portal registration in CRM",
    },
} as const;

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ["ru", "es", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Default language
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
