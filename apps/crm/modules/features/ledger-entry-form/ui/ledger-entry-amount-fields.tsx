"use client";

import { useTranslations } from "next-intl";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { FieldInput, FieldSelect, Label, Switch } from "@workspace/ui";

import { type FinanceCategory, type TaxRate, useTaxRateLabel } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

import {
    defaultEntryRate,
    type LedgerEntryFormValues,
    previewTotals,
} from "../model/ledger-entry-form";

interface LedgerEntryAmountFieldsProps {
    form: UseFormReturn<LedgerEntryFormValues>;
    categories: readonly FinanceCategory[];
    rates: readonly TaxRate[];
    error: (name: keyof LedgerEntryFormValues) => string | undefined;
}

/**
 * Сумма и налог: сумма с налогом (чек) или база (фактура), ставка клуба или по умолчанию,
 * удержание IRPF; под полями — база, налог и сумма к оплате, как их посчитает учёт.
 */
export function LedgerEntryAmountFields({
    form,
    categories,
    rates,
    error,
}: LedgerEntryAmountFieldsProps) {
    const t = useTranslations("crm.finance.entryForm");
    const rateLabel = useTaxRateLabel();
    const money = useMoneyFormat();
    const [direction, categoryId, taxRateId, amount, includesTax, withholding] = useWatch({
        control: form.control,
        name: [
            "direction",
            "categoryId",
            "taxRateId",
            "amount",
            "amountIncludesTax",
            "withholdingPercent",
        ],
    });
    const transfer = direction === "transfer";
    const category = categories.find((item) => item.id === categoryId);
    const fallback = defaultEntryRate(direction, category, rates);
    const rate = taxRateId ? rates.find((item) => item.id === taxRateId) : fallback;
    const totals = previewTotals(
        Number.isFinite(amount) ? amount : 0,
        transfer || includesTax,
        transfer ? undefined : rate,
        transfer ? 0 : withholding || 0
    );

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                    id="entry-amount"
                    label={t("fields.amount")}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    required
                    error={error("amount")}
                    {...form.register("amount", { valueAsNumber: true })}
                />
                {!transfer && (
                    <Controller
                        control={form.control}
                        name="amountIncludesTax"
                        render={({ field }) => (
                            <div className="flex items-end gap-3 pb-2">
                                <Switch
                                    id="entry-includes-tax"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                                <Label htmlFor="entry-includes-tax" className="text-sm font-normal">
                                    {field.value ? t("includesTax") : t("excludesTax")}
                                </Label>
                            </div>
                        )}
                    />
                )}
            </div>
            {!transfer && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <Controller
                        control={form.control}
                        name="taxRateId"
                        render={({ field }) => (
                            <FieldSelect
                                id="entry-tax-rate"
                                label={t("fields.taxRate")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={[
                                    {
                                        value: "",
                                        label: t("taxDefault", {
                                            rate: fallback ? rateLabel(fallback) : t("noTax"),
                                        }),
                                    },
                                    ...rates
                                        .filter((item) => !item.archivedAt)
                                        .map((item) => ({
                                            value: item.id,
                                            label: rateLabel(item),
                                        })),
                                ]}
                            />
                        )}
                    />
                    <FieldInput
                        id="entry-withholding"
                        label={t("fields.withholding")}
                        helperText={t("withholdingHint")}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        max={100}
                        error={error("withholdingPercent")}
                        {...form.register("withholdingPercent", { valueAsNumber: true })}
                    />
                </div>
            )}
            {!transfer && (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground tabular-nums">
                    {t("preview", {
                        net: money(totals.net),
                        tax: money(totals.tax),
                        withholding: money(totals.withholding),
                        payable: money(totals.payable),
                    })}
                </p>
            )}
        </div>
    );
}
