/**
 * Mail module constants
 * All magic strings and configuration values for mail module
 */

/**
 * Default sender when SMTP_FROM / SMTP_FROM_NAME are not set
 */
export const DEFAULT_EMAIL_FROM = "noreply@paf-paf.app";
export const DEFAULT_EMAIL_FROM_NAME = "PafPaf";

/**
 * Brand in email texts and layout — until the shared brand package (TASK-531) exists
 */
export const MAIL_BRAND_NAME = "PafPaf";
export const MAIL_BRAND_WORDMARK = "paf paf";
export const MAIL_BRAND_SITE_URL = "https://paf-paf.app";

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
    MEMBERSHIP_CONSENT: {
        ru: "Подтвердите вступление в клуб",
        es: "Confirma tu ingreso en el club",
        en: "Confirm joining the club",
    },
    EMPLOYEE_INVITATION: {
        ru: "Приглашение в команду клуба",
        es: "Invitación al equipo del club",
        en: "Invitation to the club team",
    },
    ACCOUNT_SETUP: {
        ru: "Задайте пароль для входа",
        es: "Crea una contraseña para entrar",
        en: "Set a password to sign in",
    },
    TELEGRAM_EMAIL: {
        ru: "Подтвердите почту для входа через Telegram",
        es: "Confirma tu correo para entrar con Telegram",
        en: "Confirm your email to sign in with Telegram",
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
