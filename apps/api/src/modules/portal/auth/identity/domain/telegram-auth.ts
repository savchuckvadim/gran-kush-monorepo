import { createHash, createHmac, timingSafeEqual } from "crypto";

import { type ExternalProfile, IDENTITY_PROVIDER_KEYS } from "./identity-provider";

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

/** Ответ виджета годен час: перехваченный ответ не должен открывать вход навсегда. */
export const TELEGRAM_AUTH_MAX_AGE_SECONDS = 60 * 60;

const NAME_MAX = 256;
const USERNAME_MAX = 64;
const URL_MAX = 512;
const HASH = /^[a-f0-9]{64}$/;

const optionalString = (value: unknown, max: number): value is string | undefined =>
    value === undefined || (typeof value === "string" && value.length <= max);

/**
 * Ответ виджета из тела запроса. Берутся только поля Telegram Login: подпись считается по ним, и
 * лишнее поле от клиента просто не попадёт в проверку. Чужая форма — `null`.
 */
export const parseTelegramAuthData = (value: Record<string, unknown>): TelegramAuthData | null => {
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = value;
    if (!Number.isSafeInteger(id) || !Number.isSafeInteger(auth_date)) return null;
    if (typeof first_name !== "string" || first_name.length > NAME_MAX) return null;
    if (typeof hash !== "string" || !HASH.test(hash)) return null;
    if (!optionalString(last_name, NAME_MAX) || !optionalString(username, USERNAME_MAX)) {
        return null;
    }
    if (!optionalString(photo_url, URL_MAX)) return null;
    return {
        id: id as number,
        first_name,
        last_name,
        username,
        photo_url,
        auth_date: auth_date as number,
        hash,
    };
};

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

/** Профиль Telegram в общем виде. Почты у Telegram нет — вход новому идёт через шаг почты. */
export const toTelegramProfile = (data: TelegramAuthData): ExternalProfile => ({
    provider: IDENTITY_PROVIDER_KEYS.Telegram,
    subject: String(data.id),
    email: null,
    emailVerified: false,
    displayName: [data.first_name, data.last_name].filter(Boolean).join(" ") || null,
    givenName: data.first_name,
    familyName: data.last_name ?? null,
    username: data.username ?? null,
    locale: null,
});
