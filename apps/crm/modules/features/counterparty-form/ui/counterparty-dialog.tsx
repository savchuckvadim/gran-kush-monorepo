"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import {
    type Counterparty,
    MANUAL_COUNTERPARTY_KINDS,
    useCreateCounterparty,
    useLedgerErrorText,
    useUpdateCounterparty,
} from "@/modules/entities/finance";

import {
    counterpartyFormSchema,
    type CounterpartyFormValues,
    counterpartyFormValues,
    toCounterpartyInput,
} from "../model/counterparty-form";

const FORM_ID = "counterparty-form";

interface CounterpartyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Правка; без неё — новый контрагент */
    counterparty?: Counterparty;
}

/** Поставщик, клиент или госорган: имя, NIF (испанский проверяется по контрольному знаку), страна. */
export function CounterpartyDialog({ open, onOpenChange, counterparty }: CounterpartyDialogProps) {
    const t = useTranslations("crm.finance.counterparties");
    const errorText = useLedgerErrorText();
    const create = useCreateCounterparty();
    const update = useUpdateCounterparty();
    const pending = create.isPending || update.isPending;
    const form = useForm<CounterpartyFormValues>({
        resolver: zodResolver(counterpartyFormSchema),
        defaultValues: counterpartyFormValues(counterparty),
    });

    useEffect(() => {
        if (open) form.reset(counterpartyFormValues(counterparty));
    }, [open, counterparty, form]);

    const submit = form.handleSubmit((values) => {
        const input = toCounterpartyInput(values);
        const done = {
            onSuccess: () => {
                toast.success(counterparty ? t("updated") : t("created"));
                onOpenChange(false);
            },
            onError: (error: unknown) => toast.error(errorText(error)),
        };
        if (counterparty) update.mutate({ id: counterparty.id, input }, done);
        else create.mutate(input, done);
    });

    const error = (name: keyof CounterpartyFormValues) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };

    return (
        <ModalDialog
            scrollable
            open={open}
            onOpenChange={onOpenChange}
            title={counterparty ? t("editTitle") : t("createTitle")}
            description={t("dialogHint")}
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
            <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-4">
                <Controller
                    control={form.control}
                    name="kind"
                    render={({ field }) => (
                        <FieldSelect
                            id="counterparty-kind"
                            label={t("fields.kind")}
                            value={field.value}
                            onValueChange={field.onChange}
                            options={MANUAL_COUNTERPARTY_KINDS.map((kind) => ({
                                value: kind,
                                label: t(`kinds.${kind}`),
                            }))}
                        />
                    )}
                />
                <FieldInput
                    id="counterparty-name"
                    label={t("fields.name")}
                    required
                    error={error("name")}
                    {...form.register("name")}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                        <FieldInput
                            id="counterparty-nif"
                            label={t("fields.nif")}
                            helperText={t("nifHint")}
                            placeholder="B12345674"
                            error={error("nif")}
                            {...form.register("nif")}
                        />
                    </div>
                    <FieldInput
                        id="counterparty-country"
                        label={t("fields.country")}
                        placeholder="ES"
                        maxLength={2}
                        error={error("country")}
                        {...form.register("country")}
                    />
                </div>
                <FieldInput
                    id="counterparty-notes"
                    label={t("fields.notes")}
                    error={error("notes")}
                    {...form.register("notes")}
                />
            </form>
        </ModalDialog>
    );
}
