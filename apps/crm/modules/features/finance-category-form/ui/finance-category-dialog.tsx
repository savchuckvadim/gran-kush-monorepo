"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import {
    type FinanceCategory,
    useCreateFinanceCategory,
    useFinanceCategoryLabel,
    useLedgerErrorText,
    useUpdateFinanceCategory,
} from "@/modules/entities/finance";

const FORM_ID = "finance-category-form";
/** "" — налог по ставке клуба; иначе режим статьи вне налога. */
const TREATMENTS = ["", "exempt", "not_subject"] as const;

const schema = (isPreset: boolean) =>
    z.object({
        name: z
            .string()
            .trim()
            .max(80, "tooLong")
            .refine((value) => isPreset || value.length > 0, "required"),
        direction: z.enum(["income", "expense"]),
        pgcAccount: z
            .string()
            .trim()
            .refine((value) => value === "" || /^[0-9]{2,10}$/.test(value), "pgc"),
        taxTreatment: z.enum(TREATMENTS),
    });
type Values = z.infer<ReturnType<typeof schema>>;

const valuesOf = (category?: FinanceCategory): Values => ({
    name: category?.name ?? "",
    direction: category?.direction ?? "expense",
    pgcAccount: category?.pgcAccount ?? "",
    taxTreatment:
        category?.taxTreatment === "exempt" || category?.taxTreatment === "not_subject"
            ? category.taxTreatment
            : "",
});

interface FinanceCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category?: FinanceCategory;
}

/** Своя статья или правка пресета: название, счёт PGC, налог по умолчанию. Код — для импорта. */
export function FinanceCategoryDialog({
    open,
    onOpenChange,
    category,
}: FinanceCategoryDialogProps) {
    const t = useTranslations("crm.finance.categories");
    const label = useFinanceCategoryLabel();
    const errorText = useLedgerErrorText();
    const create = useCreateFinanceCategory();
    const update = useUpdateFinanceCategory();
    const pending = create.isPending || update.isPending;
    const isPreset = Boolean(category?.isPreset);
    const form = useForm<Values>({
        resolver: zodResolver(schema(isPreset)),
        defaultValues: valuesOf(category),
    });

    useEffect(() => {
        if (open) form.reset(valuesOf(category));
    }, [open, category, form]);

    const submit = form.handleSubmit((values) => {
        const common = {
            pgcAccount: values.pgcAccount || null,
            taxTreatment: values.taxTreatment || null,
        };
        const done = {
            onSuccess: () => {
                toast.success(category ? t("updated") : t("created"));
                onOpenChange(false);
            },
            onError: (error: unknown) => toast.error(errorText(error)),
        };
        if (category)
            update.mutate(
                { id: category.id, change: { ...common, name: values.name || null } },
                done
            );
        else create.mutate({ ...common, name: values.name, direction: values.direction }, done);
    });

    const error = (name: keyof Values) => {
        const message = form.formState.errors[name]?.message;
        return message ? t(`errors.${message}`) : undefined;
    };

    return (
        <ModalDialog
            open={open}
            onOpenChange={onOpenChange}
            title={category ? t("editTitle") : t("createTitle")}
            description={category ? t("codeHint", { code: category.code }) : t("dialogHint")}
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
                    id="category-name"
                    label={t("fields.name")}
                    placeholder={
                        category?.isPreset ? label({ ...category, name: null }) : undefined
                    }
                    required={!isPreset}
                    error={error("name")}
                    {...form.register("name")}
                />
                {!category && (
                    <Controller
                        control={form.control}
                        name="direction"
                        render={({ field }) => (
                            <FieldSelect
                                id="category-direction"
                                label={t("fields.direction")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={[
                                    { value: "expense", label: t("expense") },
                                    { value: "income", label: t("income") },
                                ]}
                            />
                        )}
                    />
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                        id="category-pgc"
                        label={t("fields.pgcAccount")}
                        placeholder="629"
                        error={error("pgcAccount")}
                        {...form.register("pgcAccount")}
                    />
                    <Controller
                        control={form.control}
                        name="taxTreatment"
                        render={({ field }) => (
                            <FieldSelect
                                id="category-treatment"
                                label={t("fields.taxTreatment")}
                                value={field.value}
                                onValueChange={field.onChange}
                                options={TREATMENTS.map((value) => ({
                                    value,
                                    label: t(`treatments.${value || "club"}`),
                                }))}
                            />
                        )}
                    />
                </div>
            </form>
        </ModalDialog>
    );
}
