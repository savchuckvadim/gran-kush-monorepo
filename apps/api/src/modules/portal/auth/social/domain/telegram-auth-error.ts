/** Почему вход или привязка через Telegram не прошли; код уходит клиенту, тот переводит его. */
export type TelegramAuthFailure =
    /** Бот не настроен (нет токена или имени бота) */
    | "telegram_off"
    /** Подпись виджета не сошлась или ответ устарел */
    | "telegram_signature"
    /** Шаг «укажите почту» открыт слишком давно или подделан */
    | "telegram_ticket"
    /** Ссылка из письма устарела или подделана */
    | "telegram_link"
    /** Этот Telegram уже привязан к другому аккаунту */
    | "telegram_taken"
    /** К аккаунту уже привязан другой Telegram */
    | "telegram_other_linked"
    /** Аккаунт заблокирован */
    | "account_blocked";

export class TelegramAuthError extends Error {
    constructor(readonly reason: TelegramAuthFailure) {
        super(`Telegram sign-in rejected: ${reason}`);
    }
}
