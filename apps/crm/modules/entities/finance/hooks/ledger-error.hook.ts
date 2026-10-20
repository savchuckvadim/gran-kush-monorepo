"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";

import { isLedgerErrorCode } from "../api/ledger.api";

/** Текст отказа API учёта: известный код — переводом, остальное — сообщением API. */
export function useLedgerErrorText(): (error: unknown) => string {
    const t = useTranslations("crm.finance.errors");
    return useCallback(
        (error: unknown) => {
            const code = getApiErrorCode(error);
            return isLedgerErrorCode(code) ? t(code) : getApiErrorMessage(error);
        },
        [t]
    );
}
