/** Коды отказов настроек входа: клиент показывает текст на языке интерфейса по коду. */
export const ACCOUNT_SECURITY_ERRORS = {
    /** Текущий пароль не назван или не совпал. */
    wrongPassword: "wrong_password",
    /** Последний способ входа не снимается: сначала задать пароль или привязать другой. */
    lastSignInMethod: "last_sign_in_method",
    /** Google к аккаунту не привязан. */
    googleNotLinked: "google_not_linked",
    /** Telegram к аккаунту не привязан. */
    telegramNotLinked: "telegram_not_linked",
} as const;
