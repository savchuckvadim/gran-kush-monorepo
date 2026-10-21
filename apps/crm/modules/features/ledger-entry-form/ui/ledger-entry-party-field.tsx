"use client";

import { useTranslations } from "next-intl";

import { X } from "lucide-react";
import { Controller, type UseFormReturn, useWatch } from "react-hook-form";

import { Button, FieldSelect } from "@workspace/ui";

import type { Counterparty } from "@/modules/entities/finance";
import { MemberPicker } from "@/modules/entities/member";

import type { LedgerEntryFormValues } from "../model/ledger-entry-form";

interface LedgerEntryPartyFieldProps {
    form: UseFormReturn<LedgerEntryFormValues>;
    counterparties: readonly Counterparty[];
}

/**
 * Контрагент проводки: поставщик или клиент из справочника либо участник клуба (взнос) —
 * участник становится контрагентом сам при записи.
 */
export function LedgerEntryPartyField({ form, counterparties }: LedgerEntryPartyFieldProps) {
    const t = useTranslations("crm.finance.entryForm");
    const member = useWatch({ control: form.control, name: "member" });
    const options = [
        { value: "", label: t("noCounterparty") },
        ...counterparties
            .filter((party) => !party.archivedAt)
            .map((party) => ({
                value: party.id,
                label: [party.name ?? t("deletedMember"), party.nif].filter(Boolean).join(" · "),
            })),
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Controller
                control={form.control}
                name="counterpartyId"
                render={({ field }) => (
                    <FieldSelect
                        id="entry-counterparty"
                        label={t("fields.counterparty")}
                        hint={t("hints.counterparty")}
                        value={member ? "" : field.value}
                        disabled={Boolean(member)}
                        onValueChange={field.onChange}
                        options={options}
                    />
                )}
            />
            <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                    <MemberPicker
                        label={t("fields.member")}
                        value={member}
                        onChange={(choice) => {
                            form.setValue("member", choice, { shouldDirty: true });
                            form.setValue("counterpartyId", "");
                        }}
                    />
                </div>
                {member && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("clearMember")}
                        onClick={() => form.setValue("member", null, { shouldDirty: true })}
                    >
                        <X aria-hidden="true" />
                    </Button>
                )}
            </div>
        </div>
    );
}
