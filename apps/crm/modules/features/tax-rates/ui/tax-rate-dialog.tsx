"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import {
    TAX_TREATMENTS,
    type TaxRate,
    useCreateTaxRate,
    useTaxRateLabel,
    useUpdateTaxRate,
} from "@/modules/entities/finance";

import {
    taxRateFormSchema,
    type TaxRateFormValues,
    taxRateFormValues,
    toTaxRateChange,
    toTaxRateInput,
} from "../model/tax-rate-form";

const FORM_ID = "tax-rate-form";

interface TaxRateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Правка ставки; без неё — новая */
    rate?: TaxRate;
}

/** Своя ставка или правка: подпись, режим и процент. У пресета подпись можно оставить пустой. */
export function TaxRateDialog({ open, onOpenChange, rate }: TaxRateDialogProps) {
    const t = useTranslations("crm.finance.taxRates");
    const label = useTaxRateLabel();
    const isPreset = Boolean(rate?.presetCode);
    const create = useCreateTaxRate();
    const update = useUpdateTaxRate();
    const pending = create.isPending || update.isPending;
    const form = useForm<TaxRateFormValues>({
        resolver: zodResolver(taxRateFormSchema(isPreset)),
        defaultValues: taxRateFormValues(rate),
    });
    const treatment = useWatch({ control: form.control, name: "treatment" });

    useEffect(() => {
        if (open) form.reset(taxRateFormValues(rate));
    }, [open, rate, form]);

    // exenta и no sujeta — без процента; поле только для чтения, а не disabled: так оно остаётся в форме
    useEffect(() => {
        if (treatment !== "taxable") form.setValue("percent", 0);
    }, [treatment, form]);

    const submit = form.handleSubmit((values) => {
        const done = {
            onSuccess: () => {
                toast.success(rate ? t("updated") : t("created"));
                onOpenChange(false);
            },
            onError: (error: unknown) => toast.error(getApiErrorMessage(error)),
        };
        if (rate) update.mutate({ id: rate.id, change: toTaxRateChange(values) }, done);
        else create.mutate(toTaxRateInput(values), done);
    });

    const error = (name: keyof TaxRateFormValues) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };

    return (
        <ModalDialog
            scrollable
            open={open}
            onOpenChange={onOpenChange}
            title={rate ? t("editTitle") : t("createTitle")}
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
                <FieldInput
                    id="tax-rate-name"
                    label={t("fields.name")}
                    placeholder={
                        rate?.presetCode
                            ? label({ ...rate, name: null })
                            : t("fields.namePlaceholder")
                    }
                    required={!isPreset}
                    error={error("name")}
                    {...form.register("name")}
                />
                <Controller
                    control={form.control}
                    name="treatment"
                    render={({ field }) => (
                        <FieldSelect
                            id="tax-rate-treatment"
                            label={t("fields.treatment")}
                            helperText={t(`treatmentHint.${field.value}`)}
                            value={field.value}
                            options={TAX_TREATMENTS.map((code) => ({
                                value: code,
                                label: t(`treatment.${code}`),
                            }))}
                            onValueChange={field.onChange}
                        />
                    )}
                />
                <FieldInput
                    id="tax-rate-percent"
                    label={t("fields.percent")}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min={0}
                    max={100}
                    readOnly={treatment !== "taxable"}
                    error={error("percent")}
                    {...form.register("percent", { valueAsNumber: true })}
                />
            </form>
        </ModalDialog>
    );
}
