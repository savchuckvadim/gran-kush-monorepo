"use client";

import { useTranslations } from "next-intl";

import { Archive, Pencil } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import {
    type FinanceCategory,
    ORDER_SALE_CATEGORY,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";

interface FinanceCategoryRowProps {
    category: FinanceCategory;
    canAdmin: boolean;
    onEdit: (category: FinanceCategory) => void;
    onArchive: (category: FinanceCategory) => void;
}

/** Статья: подпись, код для таблицы импорта, счёт PGC, налог по умолчанию. */
export function FinanceCategoryRow({
    category,
    canAdmin,
    onEdit,
    onArchive,
}: FinanceCategoryRowProps) {
    const t = useTranslations("crm.finance.categories");
    const label = useFinanceCategoryLabel();
    return (
        <li
            className={`flex flex-wrap items-center gap-2 py-2 text-sm ${category.archivedAt ? "text-muted-foreground" : ""}`}
        >
            <span className="min-w-0 flex-1 truncate">{label(category)}</span>
            <code className="rounded bg-muted px-1 text-xs">{category.code}</code>
            {category.pgcAccount && (
                <span className="text-xs text-muted-foreground tabular-nums">
                    PGC {category.pgcAccount}
                </span>
            )}
            {category.taxTreatment && category.taxTreatment !== "taxable" && (
                <Badge variant="secondary">{t(`treatments.${category.taxTreatment}`)}</Badge>
            )}
            {category.archivedAt && <Badge variant="outline">{t("archivedBadge")}</Badge>}
            {canAdmin && !category.archivedAt && (
                <span className="flex">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit")}
                        onClick={() => onEdit(category)}
                    >
                        <Pencil aria-hidden="true" />
                    </Button>
                    {category.code !== ORDER_SALE_CATEGORY && (
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("archive")}
                            onClick={() => onArchive(category)}
                        >
                            <Archive aria-hidden="true" />
                        </Button>
                    )}
                </span>
            )}
        </li>
    );
}
