"use client";

import { useTranslations } from "next-intl";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";

/** Коды отказов API входа через Telegram — у каждого свой текст в `cabinet.auth.telegram.errors`. */
const KNOWN = [
    "telegram_off",
    "telegram_signature",
    "identity_ticket",
    "identity_link",
    "telegram_taken",
    "telegram_other_linked",
    "account_blocked",
    "last_sign_in_method",
] as const;

type KnownCode = (typeof KNOWN)[number];

const isKnown = (code: string | undefined): code is KnownCode =>
    code !== undefined && (KNOWN as readonly string[]).includes(code);

/** Понятная причина отказа: по коду API, иначе — сообщение ответа. */
export function useTelegramErrorText(): (error: unknown) => string {
    const t = useTranslations("cabinet.auth.telegram.errors");
    return (error) => {
        const code = getApiErrorCode(error);
        return isKnown(code) ? t(code) : getApiErrorMessage(error);
    };
}
