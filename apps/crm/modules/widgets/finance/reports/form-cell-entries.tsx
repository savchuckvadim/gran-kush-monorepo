"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { X } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import {
    type FormCellRef,
    type LedgerEntry,
    SKIPPED_FORM_CELL,
    useFinanceCategories,
    useFormCellEntries,
} from "@/modules/entities/finance";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { LedgerPager } from "../ledger/ledger-pager";
import { LedgerRow } from "../ledger/ledger-row";

const PAGE_SIZE = 25;

interface FormCellEntriesProps {
    cell: FormCellRef;
    onClose: () => void;
    onOpen: (entry: LedgerEntry) => void;
}

/** Откуда взялась сумма ячейки: её проводки, новые сверху, по 25. */
export function FormCellEntries({ cell, onClose, onOpen }: FormCellEntriesProps) {
    const t = useTranslations("crm.finance.reports.forms");
    // страница помнит свою ячейку: другая ячейка — снова первая страница
    const [paging, setPaging] = useState({ cell, page: 1 });
    const page = paging.cell === cell ? paging.page : 1;
    const entries = useFormCellEntries(cell, page, PAGE_SIZE);
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    const title =
        cell.cell === SKIPPED_FORM_CELL
            ? t("skippedTitle", { form: t(`${cell.form}.title`) })
            : t("cellTitle", { form: t(`${cell.form}.title`), code: cell.cell });
    const data = entries.data;
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading
                title={title}
                actions={
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("closeCell")}
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </Button>
                }
            />
            {entries.isLoading && <PageSpinner />}
            {entries.isError && <p className="px-3 text-sm text-destructive">{t("cellError")}</p>}
            {data && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <tbody>
                            {data.items.map((entry) => (
                                <LedgerRow
                                    key={entry.id}
                                    entry={entry}
                                    categories={categories}
                                    onOpen={onOpen}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data && (
                <div className="px-3">
                    <LedgerPager
                        page={data.page}
                        totalPages={data.totalPages}
                        total={data.total}
                        onPage={(next) => setPaging({ cell, page: next })}
                    />
                </div>
            )}
        </Card>
    );
}
