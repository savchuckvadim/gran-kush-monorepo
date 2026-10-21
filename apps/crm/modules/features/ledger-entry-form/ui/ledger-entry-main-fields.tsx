"use client";

import { useTranslations } from "next-intl";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { FieldInput, FieldSelect } from "@workspace/ui";

import {
    FINANCE_ACCOUNTS,
    type FinanceCategory,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";

import type { LedgerEntryFormValues } from "../model/ledger-entry-form";

interface LedgerEntryMainFieldsProps {
    form: UseFormReturn<LedgerEntryFormValues>;
    categories: readonly FinanceCategory[];
    error: (name: keyof LedgerEntryFormValues) => string | undefined;
}

/** Дата, статья своего направления, счёт (у перевода — откуда и куда) и описание. */
export function LedgerEntryMainFields({ form, categories, error }: LedgerEntryMainFieldsProps) {
    const t = useTranslations("crm.finance.entryForm");
    const accounts = useTranslations("crm.finance.accounts");
    const label = useFinanceCategoryLabel();
    const direction = useWatch({ control: form.control, name: "direction" });
    const categoryId = useWatch({ control: form.control, name: "categoryId" });
    const transfer = direction === "transfer";
    const accountOptions = FINANCE_ACCOUNTS.map((account) => ({
        value: account,
        label: accounts(account),
    }));
    const categoryOptions = categories
        .filter((c) => c.direction === direction && (!c.archivedAt || c.id === categoryId))
        .map((c) => ({ value: c.id, label: label(c) }));

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                    id="entry-date"
                    label={t("fields.date")}
                    type="date"
                    required
                    error={error("occurredOn")}
                    {...form.register("occurredOn")}
                />
                {!transfer && (
                    <Controller
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FieldSelect
                                id="entry-category"
                                label={t("fields.category")}
                                hint={t("hints.category")}
                                placeholder={t("categoryPlaceholder")}
                                required
                                value={field.value}
                                onValueChange={field.onChange}
                                options={categoryOptions}
                                error={error("categoryId")}
                            />
                        )}
                    />
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <Controller
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                        <FieldSelect
                            id="entry-account"
                            label={transfer ? t("fields.fromAccount") : t("fields.account")}
                            hint={t("hints.account")}
                            value={field.value}
                            onValueChange={field.onChange}
                            options={accountOptions}
                        />
                    )}
                />
                {transfer && (
                    <Controller
                        control={form.control}
                        name="toAccount"
                        render={({ field }) => (
                            <FieldSelect
                                id="entry-to-account"
                                label={t("fields.toAccount")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={accountOptions}
                                error={error("toAccount")}
                            />
                        )}
                    />
                )}
            </div>
            <FieldInput
                id="entry-description"
                label={t("fields.description")}
                placeholder={t(`descriptionPlaceholder.${direction}`)}
                required
                error={error("description")}
                {...form.register("description")}
            />
        </div>
    );
}
