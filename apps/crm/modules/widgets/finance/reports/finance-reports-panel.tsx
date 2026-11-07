"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import {
    type FormCellRef,
    type LedgerEntry,
    type QuarterRef,
    usePeriodReport,
    useTaxForms,
} from "@/modules/entities/finance";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { AccountFlowsCard } from "./account-flows-card";
import { FormCellEntries } from "./form-cell-entries";
import { ReportPdfAction } from "./report-pdf-action";
import { currentQuarter, quarterRange } from "./report-quarter";
import { ReportQuarterSelect } from "./report-quarter-select";
import { TaxFormCard } from "./tax-form-card";
import { VatCard } from "./vat-card";
import { WithholdingCard } from "./withholding-card";

interface FinanceReportsPanelProps {
    onOpen: (entry: LedgerEntry) => void;
}

/**
 * Отчёты квартала (TASK-799): цифры для форм 303 и 130 с переходом к проводкам ячейки, IVA по
 * ставкам, удержания IRPF, касса и банк. Квартал — потому что так подаются формы.
 */
export function FinanceReportsPanel({ onOpen }: FinanceReportsPanelProps) {
    const t = useTranslations("crm.finance.reports");
    const [quarter, setQuarter] = useState<QuarterRef>(() => currentQuarter());
    const [cell, setCell] = useState<FormCellRef | null>(null);
    const range = useMemo(() => quarterRange(quarter), [quarter]);
    const report = usePeriodReport(range);
    const forms = useTaxForms(quarter);
    const changeQuarter = (next: QuarterRef) => {
        setQuarter(next);
        setCell(null);
    };
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <ReportQuarterSelect value={quarter} onChange={changeQuarter} />
                <ReportPdfAction quarter={quarter} />
                <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
            </div>
            {(report.isLoading || forms.isLoading) && <PageSpinner />}
            {(report.isError || forms.isError) && (
                <p className="text-sm text-destructive">{t("error")}</p>
            )}
            {forms.data && forms.data.length > 0 && (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                    {forms.data.map((form) => (
                        <TaxFormCard
                            key={form.form}
                            form={form}
                            activeCell={cell?.form === form.form ? cell.cell : null}
                            onOpenCell={(code) =>
                                setCell({ ...quarter, form: form.form, cell: code })
                            }
                        />
                    ))}
                </div>
            )}
            {cell && <FormCellEntries cell={cell} onClose={() => setCell(null)} onOpen={onOpen} />}
            {report.data && (
                <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                    <VatCard report={report.data} />
                    <div className="space-y-4">
                        <WithholdingCard report={report.data} />
                        <AccountFlowsCard report={report.data} />
                    </div>
                </div>
            )}
        </div>
    );
}
