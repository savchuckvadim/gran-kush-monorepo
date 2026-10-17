import type { IdentityProviderKey } from "@modules/portal/auth/identity/domain/identity-provider";

/** Коды отказов настроек входа: клиент показывает текст на языке интерфейса по коду. */
export const ACCOUNT_SECURITY_ERRORS = {
    /** Текущий пароль не назван или не совпал. */
    wrongPassword: "wrong_password",
    /** Последний способ входа не снимается: сначала задать пароль или привязать другой. */
    lastSignInMethod: "last_sign_in_method",
} as const;

/** Способ входа к аккаунту не привязан: `google_not_linked`, `telegram_not_linked`. */
export const notLinkedCode = (provider: IdentityProviderKey): string => `${provider}_not_linked`;
