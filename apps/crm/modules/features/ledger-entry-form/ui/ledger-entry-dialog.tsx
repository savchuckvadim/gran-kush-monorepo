"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorCode } from "@workspace/api-client/core";
import { ConfirmDialog, FormSteps, ModalDialog } from "@workspace/ui";

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

import { ENTRY_STEPS } from "../model/entry-steps";
import {
    entryValues,
    ledgerEntryFormSchema,
    type LedgerEntryFormValues,
    newEntryValues,
    toLedgerEntryInput,
} from "../model/ledger-entry-form";
import { localToday } from "../model/local-today";
import { useEntrySteps } from "../model/use-entry-steps";

import { LedgerEntryDialogFooter } from "./ledger-entry-dialog-footer";
import { LedgerEntryStepFields } from "./ledger-entry-step-fields";

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
 * Доход, расход или перевод — мастером из трёх шагов: операция (направление, дата, статья, счёт),
 * сумма и налог, контрагент и документ. Термины объясняет «?» у поля. Новая проводка проходит
 * шаги по порядку, правка открывает их вкладками. Тот же документ у того же контрагента — вопрос
 * «не дубль ли» и запись с подтверждением.
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
    const editing = Boolean(entry);
    const steps = useEntrySteps(form, editing);
    const { restart } = steps;

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
        restart();
        filledFor.current = key;
    }, [open, entry, direction, rates.isSuccess, rates.data, form, restart]);

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

    // Enter в поле нового мастера ведёт на следующий шаг, а не записывает недозаполненное
    const submit = (event: FormEvent<HTMLFormElement>) => {
        if (!editing && !steps.last) {
            event.preventDefault();
            void steps.next();
            return;
        }
        void form.handleSubmit((values) => save(values, false), steps.showErrors)(event);
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
                scrollable
                title={entry ? t("editTitle") : t(`createTitle.${current}`)}
                description={t("hint")}
                footer={
                    <LedgerEntryDialogFooter
                        steps={steps}
                        editing={editing}
                        pending={pending}
                        formId={FORM_ID}
                        onCancel={() => onOpenChange(false)}
                    />
                }
            >
                <div className="space-y-5">
                    <FormSteps
                        steps={ENTRY_STEPS.map((id) => ({ id, title: t(`steps.${id}`) }))}
                        current={steps.step}
                        reachable={steps.reachable}
                        onSelect={(id) => {
                            const target = ENTRY_STEPS.find((step) => step === id);
                            if (target) void steps.goTo(target);
                        }}
                        counter={t("stepCounter", {
                            current: steps.index + 1,
                            total: steps.total,
                        })}
                    />
                    <form id={FORM_ID} noValidate onSubmit={submit}>
                        <LedgerEntryStepFields
                            step={steps.step}
                            form={form}
                            categories={categories}
                            rates={rates.data ?? []}
                            counterparties={counterparties}
                            error={error}
                            editing={editing}
                        />
                    </form>
                </div>
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
