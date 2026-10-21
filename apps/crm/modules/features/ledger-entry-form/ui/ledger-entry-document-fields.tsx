"use client";

import { useTranslations } from "next-intl";

import { Controller, type UseFormReturn } from "react-hook-form";

import { FieldInput, FieldSelect } from "@workspace/ui";

import { LEDGER_DOCUMENT_TYPES } from "@/modules/entities/finance";

import type { LedgerEntryFormValues } from "../model/ledger-entry-form";

interface LedgerEntryDocumentFieldsProps {
    form: UseFormReturn<LedgerEntryFormValues>;
    error: (name: keyof LedgerEntryFormValues) => string | undefined;
    /** У перевода документа нет — только дата оплаты и заметки */
    transfer: boolean;
}

/** Документ (чек, фактура), дата оплаты и заметки — то, что gestor спросит про расход. */
export function LedgerEntryDocumentFields({
    form,
    error,
    transfer,
}: LedgerEntryDocumentFieldsProps) {
    const t = useTranslations("crm.finance.entryForm");
    const types = useTranslations("crm.finance.documentTypes");
    return (
        <div className="space-y-4">
            {!transfer && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <Controller
                        control={form.control}
                        name="documentType"
                        render={({ field }) => (
                            <FieldSelect
                                id="entry-document-type"
                                label={t("fields.documentType")}
                                hint={t("hints.document")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={LEDGER_DOCUMENT_TYPES.map((type) => ({
                                    value: type,
                                    label: types(type),
                                }))}
                            />
                        )}
                    />
                    <FieldInput
                        id="entry-document-number"
                        label={t("fields.documentNumber")}
                        placeholder="F-2026-118"
                        error={error("documentNumber")}
                        {...form.register("documentNumber")}
                    />
                    <FieldInput
                        id="entry-document-date"
                        label={t("fields.documentDate")}
                        type="date"
                        {...form.register("documentDate")}
                    />
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
                <FieldInput
                    id="entry-paid-on"
                    label={t("fields.paidOn")}
                    hint={t("hints.paidOn")}
                    type="date"
                    {...form.register("paidOn")}
                />
                <div className="sm:col-span-2">
                    <FieldInput
                        id="entry-notes"
                        label={t("fields.notes")}
                        error={error("notes")}
                        {...form.register("notes")}
                    />
                </div>
            </div>
        </div>
    );
}
