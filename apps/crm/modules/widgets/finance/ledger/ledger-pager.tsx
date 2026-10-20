"use client";

import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@workspace/ui";

interface LedgerPagerProps {
    page: number;
    totalPages: number;
    total: number;
    onPage: (page: number) => void;
    /** Подпись счётчика («3 поставки»); по умолчанию — проводки */
    countLabel?: string;
}

/** Листание реестра: страница из скольких и сколько проводок всего. */
export function LedgerPager({ page, totalPages, total, onPage, countLabel }: LedgerPagerProps) {
    const t = useTranslations("crm.finance.ledger");
    const count = countLabel ?? t("total", { count: total });
    if (totalPages <= 1) return <p className="text-xs text-muted-foreground">{count}</p>;
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{count}</span>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("previous")}
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                >
                    <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="text-xs tabular-nums">
                    {t("page", { page, pages: totalPages })}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("next")}
                    disabled={page >= totalPages}
                    onClick={() => onPage(page + 1)}
                >
                    <ChevronRight aria-hidden="true" />
                </Button>
            </div>
        </div>
    );
}
