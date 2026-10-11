"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
    Button,
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    FieldInput,
} from "@workspace/ui";

import {
    AMOUNT_PATTERN,
    type CreateBillingPlanInput,
    CURRENCY_PATTERN,
    PLAN_CODE_PATTERN,
    PLAN_INTERVALS,
    STRIPE_PRICE_ID_PATTERN,
    useCreateBillingPlan,
} from "@/modules/entities/billing";

import { useBillingErrorMessage } from "../lib/use-billing-error-message";
import { ManualPriceFields, SwitchField, ToggleGroup } from "../ui/form-controls";

const PRICE_SOURCES = ["stripe", "manual"] as const;

const useCreatePlanSchema = () => {
    const t = useTranslations("billing.plans.form");
    return z
        .object({
            code: z.string().trim().max(80).regex(PLAN_CODE_PATTERN, t("codeInvalid")),
            name: z.string().trim().max(255),
            source: z.enum(PRICE_SOURCES),
            stripePriceId: z.string().trim(),
            priceAmount: z.string().trim(),
            currency: z.string().trim().toUpperCase(),
            interval: z.enum(PLAN_INTERVALS),
            isPublic: z.boolean(),
            isActive: z.boolean(),
        })
        .superRefine((values, ctx) => {
            if (values.source === "stripe") {
                if (!STRIPE_PRICE_ID_PATTERN.test(values.stripePriceId)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        path: ["stripePriceId"],
                        message: t("stripePriceIdInvalid"),
                    });
                }
                return;
            }
            if (!AMOUNT_PATTERN.test(values.priceAmount)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["priceAmount"],
                    message: t("priceAmountInvalid"),
                });
            }
            if (!CURRENCY_PATTERN.test(values.currency)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ["currency"],
                    message: t("currencyInvalid"),
                });
            }
        });
};

type CreatePlanValues = z.infer<ReturnType<typeof useCreatePlanSchema>>;

const DEFAULT_VALUES: CreatePlanValues = {
    code: "",
    name: "",
    source: "stripe",
    stripePriceId: "",
    priceAmount: "",
    currency: "EUR",
    interval: "month",
    isPublic: true,
    isActive: true,
};

const toCreateBody = (values: CreatePlanValues): CreateBillingPlanInput => ({
    code: values.code,
    ...(values.name ? { name: values.name } : {}),
    isPublic: values.isPublic,
    isActive: values.isActive,
    ...(values.source === "stripe"
        ? { stripePriceId: values.stripePriceId }
        : {
              priceAmount: values.priceAmount,
              currency: values.currency,
              interval: values.interval,
          }),
});

function CreatePlanForm({ onDone }: { onDone: () => void }) {
    const t = useTranslations("billing.plans.form");
    const tCommon = useTranslations("common");
    const schema = useCreatePlanSchema();
    const mutation = useCreateBillingPlan();
    const errorMessage = useBillingErrorMessage("plan");

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<CreatePlanValues>({
        resolver: zodResolver(schema),
        defaultValues: DEFAULT_VALUES,
    });
    const source = useWatch({ control, name: "source" });

    const onSubmit = handleSubmit((values) =>
        mutation.mutate(toCreateBody(values), {
            onSuccess: (plan) => {
                toast.success(t("created", { code: plan.code }));
                onDone();
            },
        })
    );

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FieldInput
                label={t("code")}
                helperText={t("codeHint")}
                error={errors.code?.message}
                placeholder="club-month"
                autoComplete="off"
                required
                {...register("code")}
            />
            <FieldInput
                label={t("name")}
                helperText={t("nameHint")}
                error={errors.name?.message}
                placeholder="Club"
                {...register("name")}
            />
            <Controller
                control={control}
                name="source"
                render={({ field }) => (
                    <ToggleGroup
                        label={t("source")}
                        value={field.value}
                        onChange={field.onChange}
                        options={[
                            { value: "stripe", label: t("sourceStripe") },
                            { value: "manual", label: t("sourceManual") },
                        ]}
                    />
                )}
            />
            {source === "stripe" ? (
                <FieldInput
                    label={t("stripePriceId")}
                    helperText={t("stripePriceIdHint")}
                    error={errors.stripePriceId?.message}
                    placeholder="price_…"
                    autoComplete="off"
                    required
                    {...register("stripePriceId")}
                />
            ) : (
                <ManualPriceFields
                    priceAmount={register("priceAmount")}
                    currency={register("currency")}
                    interval={register("interval")}
                    errors={{
                        priceAmount: errors.priceAmount?.message,
                        currency: errors.currency?.message,
                        interval: errors.interval?.message,
                    }}
                />
            )}
            <Controller
                control={control}
                name="isPublic"
                render={({ field }) => (
                    <SwitchField
                        label={t("isPublic")}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                    <SwitchField
                        label={t("isActive")}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            {mutation.isError ? (
                <p className="text-sm text-destructive">{errorMessage(mutation.error)}</p>
            ) : null}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">
                        {tCommon("cancel")}
                    </Button>
                </DialogClose>
                <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? t("creating") : t("create")}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function CreatePlanDialog() {
    const t = useTranslations("billing.plans");
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus />
                    {t("form.createTitle")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("form.createTitle")}</DialogTitle>
                    <DialogDescription>{t("form.createDescription")}</DialogDescription>
                </DialogHeader>
                <CreatePlanForm onDone={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
