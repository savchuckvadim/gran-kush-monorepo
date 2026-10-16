import { createHash, createHmac, timingSafeEqual } from "crypto";

/** Что присылает виджет Telegram Login после входа: поля как есть плюс подпись `hash`. */
export interface TelegramAuthData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

/** Профиль Telegram, который хранит привязка. Почты у Telegram нет. */
export interface TelegramProfile {
    telegramId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
}

/** Ответ виджета годен час: перехваченный ответ не должен открывать вход навсегда. */
export const TELEGRAM_AUTH_MAX_AGE_SECONDS = 60 * 60;

/**
 * Подпись виджета по правилу Telegram: все поля, кроме `hash`, строками «ключ=значение» по алфавиту
 * через перевод строки, HMAC-SHA256 ключом SHA256(токен бота). Сравнение за постоянное время.
 */
export const isTelegramAuthValid = (
    data: TelegramAuthData,
    botToken: string,
    nowSeconds: number
): boolean => {
    const { hash, ...fields } = data;
    const checkString = Object.entries(fields)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${key}=${String(value)}`)
        .sort()
        .join("\n");
    const secret = createHash("sha256").update(botToken).digest();
    const expected = createHmac("sha256", secret).update(checkString).digest("hex");

    const fresh = nowSeconds - data.auth_date <= TELEGRAM_AUTH_MAX_AGE_SECONDS;
    const a = Buffer.from(expected);
    const b = Buffer.from(hash);
    return fresh && a.length === b.length && timingSafeEqual(a, b);
};

export const toTelegramProfile = (data: TelegramAuthData): TelegramProfile => ({
    telegramId: String(data.id),
    firstName: data.first_name,
    lastName: data.last_name ?? null,
    username: data.username ?? null,
});
