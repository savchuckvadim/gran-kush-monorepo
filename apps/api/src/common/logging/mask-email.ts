/** Сколько первых символов локальной части оставить видимыми — хватает, чтобы узнать адрес в логе. */
const VISIBLE_LOCAL_CHARS = 1;

/**
 * Email для лога уровня log/info: `a***@club.es`. Домен остаётся — по нему разбирают проблемы
 * доставки у провайдера, а локальная часть — персональные данные и в обычный лог не идёт.
 */
export const maskEmail = (email: string): string => {
    const at = email.lastIndexOf("@");
    if (at <= 0) {
        return "***";
    }
    return `${email.slice(0, VISIBLE_LOCAL_CHARS)}***${email.slice(at)}`;
};

/** Список адресатов письма для лога. */
export const maskEmails = (emails: readonly string[]): string => emails.map(maskEmail).join(", ");
