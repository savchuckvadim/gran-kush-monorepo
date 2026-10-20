"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import type { LedgerEntry } from "@/modules/entities/finance";

/** Заголовок проводки: описание, у проводки заказа — номер заказа, у сторно — пометка. */
export function useEntryTitle(): (entry: LedgerEntry) => string {
    const t = useTranslations("crm.finance.ledger");
    return useCallback(
        (entry) => {
            const base =
                entry.description ??
                (entry.sourceLabel
                    ? t("orderSale", { number: entry.sourceLabel })
                    : t("noDescription"));
            return entry.reversalOfId ? t("reversalOf", { title: base }) : base;
        },
        [t]
    );
}
