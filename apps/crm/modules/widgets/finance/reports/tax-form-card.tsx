"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { SKIPPED_FORM_CELL, type TaxForm } from "@/modules/entities/finance";
import { CardHeading } from "@/modules/shared/ui";

import { TaxFormCellRow } from "./tax-form-cell-row";

interface TaxFormCardProps {
    form: TaxForm;
    /** Открытая ячейка этой формы */
    activeCell: string | null;
    onOpenCell: (code: string) => void;
}

/**
 * Цифры для формы: ячейки бланка с суммами и переходом к проводкам. Неприменимая форма —
 * объяснение, почему её не подают; пометки — что gestor проверяет сам.
 */
export function TaxFormCard({ form, activeCell, onOpenCell }: TaxFormCardProps) {
    const t = useTranslations("crm.finance.reports.forms");
    const title = t(`${form.form}.title`);
    if (!form.applicable) {
        return (
            <Card contentClassName="space-y-1">
                <CardHeading
                    title={title}
                    hint={t(`reasons.${form.reason ?? "not_self_employed"}`)}
                />
            </Card>
        );
    }
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={title} hint={t(`${form.form}.hint`)} />
            <ul className="divide-y">
                {form.cells.map((cell) => (
                    <TaxFormCellRow
                        key={cell.code}
                        form={form.form}
                        cell={cell}
                        active={activeCell === cell.code}
                        onOpen={onOpenCell}
                    />
                ))}
            </ul>
            {(form.notes.length > 0 || form.skippedCount > 0) && (
                <div className="space-y-1 px-3 text-xs text-muted-foreground">
                    {form.notes.map((note) => (
                        <p key={note}>{t(`notes.${note}`)}</p>
                    ))}
                    {form.skippedCount > 0 && (
                        <button
                            type="button"
                            className="text-primary underline-offset-2 hover:underline"
                            onClick={() => onOpenCell(SKIPPED_FORM_CELL)}
                        >
                            {t("showSkipped", { count: form.skippedCount })}
                        </button>
                    )}
                </div>
            )}
        </Card>
    );
}
