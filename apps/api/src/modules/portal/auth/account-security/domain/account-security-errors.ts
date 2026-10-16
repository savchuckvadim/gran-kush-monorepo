/** Коды отказов настроек входа: клиент показывает текст на языке интерфейса по коду. */
export const ACCOUNT_SECURITY_ERRORS = {
    /** Текущий пароль не назван или не совпал. */
    wrongPassword: "wrong_password",
    /** Отвязать единственный способ входа нельзя: сначала задать пароль. */
    passwordRequired: "password_required",
    /** Google к аккаунту не привязан. */
    googleNotLinked: "google_not_linked",
} as const;
