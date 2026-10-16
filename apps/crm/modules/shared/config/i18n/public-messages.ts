import type { AbstractIntlMessages } from "next-intl";

/**
 * Переводы, которые уходят в HTML страниц без входа: вход и регистрация CRM и кабинета, вступление
 * по ссылке, согласие на членство, приглашение. Словарь закрытых разделов (товары, заказы, лимиты,
 * карточка участника) сюда не входит: страница без входа не раскрывает, что внутри CRM, а её читают
 * и сканеры платёжных систем. Закрытые разделы получают полный словарь (`AppMessagesProvider`).
 *
 * Новая публичная страница с переводами из другого раздела — добавить его сюда: иначе в консоли
 * будет MISSING_MESSAGE, а на странице — ключ вместо текста.
 */
export const PUBLIC_NAMESPACES = [
    "common",
    "meta",
    "navigation",
    "auth",
    "join",
    "consent",
    "invite",
    "cabinet.auth",
    "cabinet.passport",
    "crm.shell",
    "crm.appearance",
] as const;

const isTree = (value: unknown): value is AbstractIntlMessages =>
    typeof value === "object" && value !== null;

/** Только названные ветки словаря (`"cabinet.auth"` — одна ветка внутри `cabinet`). */
export const pickNamespaces = (
    messages: AbstractIntlMessages,
    paths: readonly string[]
): AbstractIntlMessages => {
    const picked: AbstractIntlMessages = {};
    for (const path of paths) {
        const keys = path.split(".");
        let source: unknown = messages;
        let target: AbstractIntlMessages = picked;
        keys.forEach((key, index) => {
            if (!isTree(source)) return;
            source = source[key];
            if (source === undefined) return;
            if (index === keys.length - 1) {
                target[key] = source as AbstractIntlMessages[string];
                return;
            }
            const branch = target[key];
            target = isTree(branch) ? branch : (target[key] = {});
        });
    }
    return picked;
};
