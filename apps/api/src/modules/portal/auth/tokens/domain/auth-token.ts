/** Зачем выдана ссылка из письма (AUTH_ARCHITECTURE §6). */
export const AUTH_TOKEN_PURPOSES = {
    EmailVerification: "email_verification",
    PasswordReset: "password_reset",
    AccountSetup: "account_setup",
    IdentityEmailLink: "identity_email_link",
} as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[keyof typeof AUTH_TOKEN_PURPOSES];

const HOUR_MS = 60 * 60 * 1000;

/**
 * Срок ссылки. Сброс пароля — час: письмо читают сразу, а утёкшая ссылка опаснее прочих. Задать
 * пароль аккаунту, который завёл клуб, — неделя: человек может не ждать письма.
 */
export const AUTH_TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
    email_verification: 24 * HOUR_MS,
    password_reset: HOUR_MS,
    account_setup: 7 * 24 * HOUR_MS,
    identity_email_link: 24 * HOUR_MS,
};

/** Кому ссылка: аккаунту или адресу, у которого аккаунта ещё нет. */
export type AuthTokenSubject = { userId: string } | { email: string };

/** Погашенная ссылка: кому она была и что несла. */
export interface ConsumedAuthToken {
    purpose: AuthTokenPurpose;
    userId: string | null;
    email: string | null;
    payload: unknown;
}

export type ConsumeAuthTokenResult =
    | { kind: "consumed"; token: ConsumedAuthToken }
    | { kind: "expired" }
    /** Не было, уже использована или заменена новой */
    | { kind: "invalid" };
