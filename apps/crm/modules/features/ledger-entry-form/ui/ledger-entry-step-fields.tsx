"use client";

import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import type { Counterparty, FinanceCategory, TaxRate } from "@/modules/entities/finance";

import type { EntryStep } from "../model/entry-steps";
import type { LedgerEntryFormValues } from "../model/ledger-entry-form";

import { LedgerDirectionHint } from "./ledger-direction-hint";
import { LedgerDirectionSwitch } from "./ledger-direction-switch";
import { LedgerEntryAmountFields } from "./ledger-entry-amount-fields";
import { LedgerEntryDocumentFields } from "./ledger-entry-document-fields";
import { LedgerEntryMainFields } from "./ledger-entry-main-fields";
import { LedgerEntryPartyField } from "./ledger-entry-party-field";
import { LedgerEntrySummary } from "./ledger-entry-summary";

interface LedgerEntryStepFieldsProps {
    step: EntryStep;
    form: UseFormReturn<LedgerEntryFormValues>;
    categories: readonly FinanceCategory[];
    rates: readonly TaxRate[];
    counterparties: readonly Counterparty[];
    error: (name: keyof LedgerEntryFormValues) => string | undefined;
    /** У сохранённой проводки направление не меняют */
    editing: boolean;
}

/** Поля одного шага мастера; значения скрытых шагов живут в форме и не теряются. */
export function LedgerEntryStepFields({
    step,
    form,
    categories,
    rates,
    counterparties,
    error,
    editing,
}: LedgerEntryStepFieldsProps) {
    const direction = useWatch({ control: form.control, name: "direction" });

    if (step === "basics") {
        return (
            <div className="space-y-4">
                <Controller
                    control={form.control}
                    name="direction"
                    render={({ field }) => (
                        <LedgerDirectionSwitch
                            value={field.value}
                            disabled={editing}
                            onChange={(next) => {
                                field.onChange(next);
                                form.setValue("categoryId", "");
                                form.setValue("taxRateId", "");
                            }}
                        />
                    )}
                />
                <LedgerDirectionHint direction={direction} />
                <LedgerEntryMainFields form={form} categories={categories} error={error} />
            </div>
        );
    }

    if (step === "amount") {
        return (
            <LedgerEntryAmountFields
                form={form}
                categories={categories}
                rates={rates}
                error={error}
            />
        );
    }

    return (
        <div className="space-y-4">
            {direction !== "transfer" && (
                <LedgerEntryPartyField form={form} counterparties={counterparties} />
            )}
            <LedgerEntryDocumentFields
                form={form}
                error={error}
                transfer={direction === "transfer"}
            />
            <LedgerEntrySummary form={form} categories={categories} />
        </div>
    );
}
