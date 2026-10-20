"use client";

import { useTranslations } from "next-intl";

import { X } from "lucide-react";

import { Badge, FieldSelect } from "@workspace/ui";

import {
    FINANCE_ACCOUNTS,
    LEDGER_DIRECTIONS,
    type LedgerFilter,
    useCounterparties,
    useFinanceCategories,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";

import { LedgerMonthSelect } from "./ledger-month-select";

export interface LedgerFilterState extends Omit<LedgerFilter, "from" | "to" | "page" | "limit"> {
    /** `YYYY-MM`; "" — все месяцы */
    month: string;
}

interface LedgerFiltersProps {
    value: LedgerFilterState;
    onChange: (value: LedgerFilterState) => void;
    /** Вкладка «Расходы» — направление зафиксировано */
    fixedDirection?: boolean;
}

/** Фильтры реестра: месяц, направление, статья, счёт. Пустое значение — «все». */
export function LedgerFilters({ value, onChange, fixedDirection }: LedgerFiltersProps) {
    const t = useTranslations("crm.finance");
    const label = useFinanceCategoryLabel();
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    const counterparties = useCounterparties({ includeArchived: true }).data ?? [];
    const party = counterparties.find((item) => item.id === value.counterpartyId);
    const pick = <K extends keyof LedgerFilterState>(key: K, next: LedgerFilterState[K]) =>
        onChange({ ...value, [key]: next });
    return (
        <div className="flex flex-wrap items-center gap-2">
            <LedgerMonthSelect
                allowAll
                value={value.month}
                onChange={(month) => pick("month", month)}
            />
            {value.counterpartyId && (
                <Badge variant="secondary" className="gap-1">
                    {party?.name ?? t("ledger.counterparty")}
                    <button
                        type="button"
                        aria-label={t("ledger.clearCounterparty")}
                        onClick={() => pick("counterpartyId", undefined)}
                    >
                        <X className="size-3" aria-hidden="true" />
                    </button>
                </Badge>
            )}
            {!fixedDirection && (
                <FieldSelect
                    id="ledger-direction"
                    size="sm"
                    aria-label={t("ledger.direction")}
                    className="w-44"
                    value={value.direction ?? ""}
                    onValueChange={(next) =>
                        onChange({
                            ...value,
                            direction: LEDGER_DIRECTIONS.find((d) => d === next),
                            categoryId: undefined,
                        })
                    }
                    options={[
                        { value: "", label: t("ledger.allDirections") },
                        ...LEDGER_DIRECTIONS.map((d) => ({
                            value: d,
                            label: t(`directions.${d}`),
                        })),
                    ]}
                />
            )}
            <FieldSelect
                id="ledger-category"
                size="sm"
                aria-label={t("ledger.category")}
                className="w-48"
                value={value.categoryId ?? ""}
                onValueChange={(next) => pick("categoryId", next || undefined)}
                options={[
                    { value: "", label: t("ledger.allCategories") },
                    ...categories
                        .filter((c) => !value.direction || c.direction === value.direction)
                        .map((c) => ({ value: c.id, label: label(c) })),
                ]}
            />
            <FieldSelect
                id="ledger-account"
                size="sm"
                aria-label={t("ledger.account")}
                className="w-36"
                value={value.account ?? ""}
                onValueChange={(next) =>
                    pick(
                        "account",
                        FINANCE_ACCOUNTS.find((a) => a === next)
                    )
                }
                options={[
                    { value: "", label: t("ledger.allAccounts") },
                    ...FINANCE_ACCOUNTS.map((a) => ({ value: a, label: t(`accounts.${a}`) })),
                ]}
            />
        </div>
    );
}
