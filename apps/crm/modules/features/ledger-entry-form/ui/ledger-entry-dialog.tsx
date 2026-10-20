"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorCode } from "@workspace/api-client/core";
import { Button, ConfirmDialog, ModalDialog } from "@workspace/ui";

import {
    type LedgerDirection,
    type LedgerEntry,
    useCorrectLedgerEntry,
    useCounterparties,
    useCreateLedgerEntry,
    useFinanceCategories,
    useLedgerErrorText,
    useTaxRates,
} from "@/modules/entities/finance";

import {
    entryValues,
    ledgerEntryFormSchema,
    type LedgerEntryFormValues,
    newEntryValues,
    toLedgerEntryInput,
} from "../model/ledger-entry-form";
import { localToday } from "../model/local-today";

import { LedgerDirectionSwitch } from "./ledger-direction-switch";
import { LedgerEntryAmountFields } from "./ledger-entry-amount-fields";
import { LedgerEntryDocumentFields } from "./ledger-entry-document-fields";
import { LedgerEntryMainFields } from "./ledger-entry-main-fields";
import { LedgerEntryPartyField } from "./ledger-entry-party-field";

const FORM_ID = "ledger-entry-form";
const DUPLICATE_DOCUMENT = "duplicate_document";

interface LedgerEntryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Новая проводка этого направления */
    direction?: LedgerDirection;
    /** Правка ручной проводки; без неё — новая */
    entry?: LedgerEntry;
    onSaved?: (entry: LedgerEntry) => void;
}

/**
 * Доход, расход или перевод: дата, статья, счёт, сумма с налогом, контрагент, документ. Тот же
 * документ у того же контрагента — вопрос «не дубль ли» и запись с подтверждением.
 */
export function LedgerEntryDialog({
    open,
    onOpenChange,
    direction = "expense",
    entry,
    onSaved,
}: LedgerEntryDialogProps) {
    const t = useTranslations("crm.finance.entryForm");
    const errorText = useLedgerErrorText();
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    const rates = useTaxRates({ includeArchived: true });
    const counterparties = useCounterparties().data ?? [];
    const create = useCreateLedgerEntry();
    const correct = useCorrectLedgerEntry();
    const pending = create.isPending || correct.isPending;
    const [duplicate, setDuplicate] = useState<LedgerEntryFormValues | null>(null);
    const form = useForm<LedgerEntryFormValues>({
        resolver: zodResolver(ledgerEntryFormSchema),
        defaultValues: newEntryValues(direction, localToday()),
    });
    const current = useWatch({ control: form.control, name: "direction" });
    const rateList = rates.data ?? [];

    // поля заполняются один раз на открытие: обновление ставок по сокету не стирает ввод;
    // правке нужны ставки клуба, чтобы узнать ставку проводки по её проценту
    const filledFor = useRef<string | null>(null);
    useEffect(() => {
        if (!open) {
            filledFor.current = null;
            return;
        }
        const key = entry ? entry.id : `new:${direction}`;
        if (filledFor.current === key || (entry && !rates.isSuccess)) return;
        form.reset(
            entry ? entryValues(entry, rates.data ?? []) : newEntryValues(direction, localToday())
        );
        filledFor.current = key;
    }, [open, entry, direction, rates.isSuccess, rates.data, form]);

    const save = (values: LedgerEntryFormValues, allowDuplicate: boolean) => {
        const input = toLedgerEntryInput(values, allowDuplicate);
        const done = {
            onSuccess: (saved: LedgerEntry) => {
                toast.success(entry ? t("updated") : t("created"));
                onOpenChange(false);
                onSaved?.(saved);
            },
            onError: (error: unknown) => {
                if (getApiErrorCode(error) === DUPLICATE_DOCUMENT) setDuplicate(values);
                else toast.error(errorText(error));
            },
        };
        if (entry) correct.mutate({ id: entry.id, input }, done);
        else create.mutate(input, done);
    };

    const error = (name: keyof LedgerEntryFormValues) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };

    return (
        <>
            <ModalDialog
                open={open}
                onOpenChange={onOpenChange}
                size="xl"
                title={entry ? t("editTitle") : t(`createTitle.${current}`)}
                description={t("hint")}
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={pending}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" form={FORM_ID} disabled={pending}>
                            {pending ? t("saving") : t("save")}
                        </Button>
                    </>
                }
            >
                <form
                    id={FORM_ID}
                    noValidate
                    className="space-y-5"
                    onSubmit={form.handleSubmit((values) => save(values, false))}
                >
                    <Controller
                        control={form.control}
                        name="direction"
                        render={({ field }) => (
                            <LedgerDirectionSwitch
                                value={field.value}
                                disabled={Boolean(entry)}
                                onChange={(next) => {
                                    field.onChange(next);
                                    form.setValue("categoryId", "");
                                    form.setValue("taxRateId", "");
                                }}
                            />
                        )}
                    />
                    <LedgerEntryMainFields form={form} categories={categories} error={error} />
                    <LedgerEntryAmountFields
                        form={form}
                        categories={categories}
                        rates={rateList}
                        error={error}
                    />
                    {current !== "transfer" && (
                        <LedgerEntryPartyField form={form} counterparties={counterparties} />
                    )}
                    <LedgerEntryDocumentFields
                        form={form}
                        error={error}
                        transfer={current === "transfer"}
                    />
                </form>
            </ModalDialog>
            <ConfirmDialog
                open={duplicate !== null}
                onOpenChange={(next) => !next && setDuplicate(null)}
                title={t("duplicateTitle")}
                description={t("duplicateDescription")}
                confirmLabel={t("duplicateConfirm")}
                cancelLabel={t("cancel")}
                pending={pending}
                onConfirm={() => {
                    if (duplicate) save(duplicate, true);
                    setDuplicate(null);
                }}
            />
        </>
    );
}
