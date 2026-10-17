import { createHash, randomBytes } from "crypto";

/** 32 случайных байта — 64 hex-символа в ссылке. */
const SECRET_TOKEN_BYTES = 32;

/**
 * SHA-256 одноразового секрета из письма (подтверждение почты, сброс пароля, согласие на
 * членство, приглашение сотрудника). В БД лежит только хеш: дамп таблицы не даёт рабочих ссылок.
 * Токен случайный и длинный, поэтому соль и медленный хеш не нужны.
 */
export const hashSecretToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

/** Новый секрет: `token` уходит в письмо или ответ, `hash` — в БД. */
export const issueSecretToken = (): { token: string; hash: string } => {
    const token = randomBytes(SECRET_TOKEN_BYTES).toString("hex");
    return { token, hash: hashSecretToken(token) };
};
