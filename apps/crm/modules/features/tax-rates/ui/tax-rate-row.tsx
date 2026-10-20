"use client";

import { useLocale, useTranslations } from "next-intl";

import { Archive, Pencil } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import { type TaxRate, useTaxRateLabel } from "@/modules/entities/finance";

interface TaxRateRowProps {
    rate: TaxRate;
    canEdit: boolean;
    busy: boolean;
    onEdit: () => void;
    onMakeDefault: () => void;
    onArchive: () => void;
}

/**
 * Ставка в списке: подпись, «по умолчанию», действия у finance.admin. Процент или режим —
 * второй строкой только у своих подписей: у пресета они уже в названии («IVA general 21 %»).
 */
export function TaxRateRow({
    rate,
    canEdit,
    busy,
    onEdit,
    onMakeDefault,
    onArchive,
}: TaxRateRowProps) {
    const t = useTranslations("crm.finance.taxRates");
    const locale = useLocale();
    const label = useTaxRateLabel();
    const percent = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
        rate.percent
    );

    return (
        <li className="flex flex-wrap items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
                <p className="font-medium">{label(rate)}</p>
                {(rate.presetCode === null || rate.name !== null) && (
                    <p className="text-sm text-muted-foreground">
                        {rate.treatment === "taxable"
                            ? `${percent} %`
                            : t(`treatment.${rate.treatment}`)}
                    </p>
                )}
            </div>
            {rate.isDefault && <Badge variant="secondary">{t("default")}</Badge>}
            {canEdit && (
                <div className="flex items-center gap-1">
                    {!rate.isDefault && (
                        <Button size="sm" variant="ghost" onClick={onMakeDefault} disabled={busy}>
                            {t("makeDefault")}
                        </Button>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={onEdit}
                        aria-label={t("edit")}
                        title={t("edit")}
                    >
                        <Pencil aria-hidden="true" />
                    </Button>
                    {!rate.isDefault && (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={onArchive}
                            disabled={busy}
                            aria-label={t("archive")}
                            title={t("archive")}
                        >
                            <Archive aria-hidden="true" />
                        </Button>
                    )}
                </div>
            )}
        </li>
    );
}
