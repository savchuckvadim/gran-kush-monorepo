import type { IdentityProviderKey } from "./identity-provider";

/** Почему вход или привязка через провайдера не прошли. */
export type IdentityFailure =
    /** Такого способа входа нет */
    | "unknown"
    /** Провайдер не настроен для этой аудитории */
    | "off"
    /** Подпись виджета не сошлась, ответ устарел или обмен кода не удался */
    | "signature"
    /** Провайдер не подтвердил почту, а она нужна */
    | "unverified"
    /** Этот способ входа уже привязан к другому аккаунту */
    | "taken"
    /** К аккаунту уже привязан другой аккаунт этого провайдера */
    | "other_linked"
    /** Шаг «укажите почту» открыт слишком давно или подделан */
    | "ticket"
    /** Ссылка из письма устарела, использована или подделана */
    | "link"
    | "account_blocked"
    /** Аккаунт, к которому привязывали, пропал или заблокирован */
    | "account_gone";

/** Причины, общие для всех провайдеров: код без имени провайдера. */
const SHARED: Partial<Record<IdentityFailure, string>> = {
    unknown: "identity_unknown",
    ticket: "identity_ticket",
    link: "identity_link",
    account_blocked: "account_blocked",
    account_gone: "account_gone",
};

export class IdentityError extends Error {
    constructor(
        readonly reason: IdentityFailure,
        readonly provider: IdentityProviderKey | null = null
    ) {
        super(`Identity sign-in rejected: ${provider ?? "identity"}/${reason}`);
    }

    /** Код для клиента: `telegram_taken`, `google_off`, `identity_link`… — фронт переводит его. */
    get code(): string {
        return SHARED[this.reason] ?? `${this.provider ?? "identity"}_${this.reason}`;
    }
}
