import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    NotFoundException,
    ServiceUnavailableException,
} from "@nestjs/common";

import { IdentityError, type IdentityFailure } from "../domain/identity-error";

/*
 * 401 здесь не годится: клиент на 401 идёт обновлять сессию и повторяет запрос. Неверная подпись
 * или устаревшая ссылка — это 400 с кодом, клиент показывает причину.
 */
const STATUS: Record<IdentityFailure, new (body: object) => HttpException> = {
    unknown: NotFoundException,
    off: ServiceUnavailableException,
    signature: BadRequestException,
    unverified: BadRequestException,
    ticket: BadRequestException,
    link: BadRequestException,
    taken: ConflictException,
    other_linked: ConflictException,
    account_blocked: ForbiddenException,
    account_gone: ForbiddenException,
};

/** Отказ способа входа — HTTP-ответ с кодом причины; прочие ошибки идут дальше как есть. */
export const toIdentityHttpError = (error: unknown): unknown =>
    error instanceof IdentityError
        ? new STATUS[error.reason]({ message: error.message, code: error.code })
        : error;
