"use client";

import { useTranslations } from "next-intl";

import { Info } from "lucide-react";

import type { LedgerDirection } from "@/modules/entities/finance";

/** Что значит выбранное направление и что для него понадобится. */
export function LedgerDirectionHint({ direction }: { direction: LedgerDirection }) {
    const t = useTranslations("crm.finance.entryForm.directionHelp");
    return (
        <p className="flex gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{t(direction)}</span>
        </p>
    );
}
