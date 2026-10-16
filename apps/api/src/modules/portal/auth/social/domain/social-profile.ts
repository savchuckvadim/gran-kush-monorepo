/** Профиль, который вернул внешний провайдер после обмена кода. */
export interface GoogleProfile {
    /** Стабильный id пользователя у Google (`sub` из id_token). */
    providerUserId: string;
    email: string;
    /** Google подтвердил владение адресом; без него email не доказан. */
    emailVerified: boolean;
    displayName: string | null;
    givenName: string | null;
    familyName: string | null;
    locale: string | null;
    /** nonce из id_token: должен совпасть с тем, что мы отправили при старте входа. */
    nonce: string | null;
}
