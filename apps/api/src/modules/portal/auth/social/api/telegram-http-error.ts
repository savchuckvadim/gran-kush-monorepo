import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    ServiceUnavailableException,
} from "@nestjs/common";

import {
    TelegramAuthError,
    type TelegramAuthFailure,
} from "@modules/portal/auth/social/domain/telegram-auth-error";

/*
 * 401 здесь не годится: клиент на 401 идёт обновлять сессию и повторяет запрос. Неверная подпись
 * или устаревшая ссылка — это 400 с кодом, клиент показывает причину.
 */
const STATUS: Record<TelegramAuthFailure, new (body: object) => HttpException> = {
    telegram_off: ServiceUnavailableException,
    telegram_signature: BadRequestException,
    telegram_ticket: BadRequestException,
    telegram_link: BadRequestException,
    telegram_taken: ConflictException,
    telegram_other_linked: ConflictException,
    account_blocked: ForbiddenException,
};

/** Отказ входа через Telegram — HTTP-ответ с кодом причины; прочие ошибки идут дальше как есть. */
export const toTelegramHttpError = (error: unknown): unknown =>
    error instanceof TelegramAuthError
        ? new STATUS[error.reason]({ message: error.message, code: error.reason })
        : error;
