/** Профиль, который вернул внешний провайдер после обмена кода. */
export interface GoogleProfile {
    /** Стабильный id пользователя у Google (`sub` из id_token). */
    providerUserId: string;
    email: string;
    /** Google подтвердил владение адресом; без него email не доказан. */
    emailVerified: boolean;
    displayName: string | null;
}
