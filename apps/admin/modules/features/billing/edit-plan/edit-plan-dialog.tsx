"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
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
    type BillingPlan,
    CURRENCY_PATTERN,
    PLAN_INTERVALS,
    type PlanInterval,
    STRIPE_PRICE_ID_PATTERN,
    type UpdateBillingPlanInput,
    useUpdateBillingPlan,
} from "@/modules/entities/billing";

import { useBillingErrorMessage } from "../lib/use-billing-error-message";
import { ManualPriceFields, SwitchField } from "../ui/form-controls";

const useEditPlanSchema = () => {
    const t = useTranslations("billing.plans.form");
    return z
        .object({
            name: z.string().trim().max(255),
            stripePriceId: z.string().trim(),
            priceAmount: z.string().trim(),
            currency: z.string().trim().toUpperCase(),
            interval: z.enum(PLAN_INTERVALS),
            isPublic: z.boolean(),
            isActive: z.boolean(),
        })
        .superRefine((values, ctx) => {
            if (values.stripePriceId) {
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

type EditPlanValues = z.infer<ReturnType<typeof useEditPlanSchema>>;

const isPlanInterval = (value: string): value is PlanInterval =>
    (PLAN_INTERVALS as readonly string[]).includes(value);

const toFormValues = (plan: BillingPlan): EditPlanValues => ({
    name: plan.name,
    stripePriceId: plan.stripePriceId ?? "",
    priceAmount: plan.priceAmount,
    currency: plan.currency,
    interval: isPlanInterval(plan.interval) ? plan.interval : "month",
    isPublic: plan.isPublic,
    isActive: plan.isActive,
});

/**
 * Только изменённые поля: повторно присланный price id API заново сверяет со Stripe,
 * а без ключей Stripe это 503.
 */
const toUpdateBody = (plan: BillingPlan, values: EditPlanValues): UpdateBillingPlanInput => {
    const body: UpdateBillingPlanInput = {};
    if (values.name && values.name !== plan.name) body.name = values.name;
    const stripePriceId = values.stripePriceId || null;
    if (stripePriceId !== plan.stripePriceId) body.stripePriceId = stripePriceId;
    if (!stripePriceId) {
        if (values.priceAmount !== plan.priceAmount) body.priceAmount = values.priceAmount;
        if (values.currency !== plan.currency) body.currency = values.currency;
        if (values.interval !== plan.interval) body.interval = values.interval;
    }
    if (values.isPublic !== plan.isPublic) body.isPublic = values.isPublic;
    if (values.isActive !== plan.isActive) body.isActive = values.isActive;
    return body;
};

function EditPlanForm({ plan, onDone }: { plan: BillingPlan; onDone: () => void }) {
    const t = useTranslations("billing.plans.form");
    const tCommon = useTranslations("common");
    const schema = useEditPlanSchema();
    const mutation = useUpdateBillingPlan();
    const errorMessage = useBillingErrorMessage("plan");

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<EditPlanValues>({
        resolver: zodResolver(schema),
        defaultValues: toFormValues(plan),
    });
    const stripePriceId = useWatch({ control, name: "stripePriceId" });

    const onSubmit = handleSubmit((values) => {
        const body = toUpdateBody(plan, values);
        if (Object.keys(body).length === 0) {
            onDone();
            return;
        }
        mutation.mutate(
            { code: plan.code, body },
            {
                onSuccess: (saved) => {
                    toast.success(t("saved", { code: saved.code }));
                    onDone();
                },
            }
        );
    });

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FieldInput label={t("name")} error={errors.name?.message} {...register("name")} />
            <FieldInput
                label={t("stripePriceId")}
                helperText={t("stripePriceIdEditHint")}
                error={errors.stripePriceId?.message}
                placeholder="price_…"
                autoComplete="off"
                {...register("stripePriceId")}
            />
            {stripePriceId.trim() ? (
                <p className="text-sm text-muted-foreground">{t("manualPriceHint")}</p>
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
                    {mutation.isPending ? t("saving") : t("save")}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function EditPlanDialog({ plan }: { plan: BillingPlan }) {
    const t = useTranslations("billing.plans");
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Pencil />
                    {t("edit")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("form.editTitle", { code: plan.code })}</DialogTitle>
                    <DialogDescription>{t("form.editDescription")}</DialogDescription>
                </DialogHeader>
                <EditPlanForm plan={plan} onDone={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}
