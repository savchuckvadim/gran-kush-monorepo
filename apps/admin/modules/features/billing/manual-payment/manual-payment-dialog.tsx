"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
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
    type ClubSubscription,
    type ClubSubscriptionRow,
    MANUAL_PAYMENT_MAX_MONTHS,
    manualPaymentAmount,
    type ManualPaymentInput,
    useBillingFormat,
    useBillingPlans,
    useRecordManualPayment,
} from "@/modules/entities/billing";

import { useBillingErrorMessage } from "../lib/use-billing-error-message";
import { SelectField } from "../ui/form-controls";

const useManualPaymentSchema = () => {
    const t = useTranslations("billing.clubs.payment");
    return z.object({
        months: z
            .number({ invalid_type_error: t("monthsInvalid") })
            .int(t("monthsInvalid"))
            .min(1, t("monthsInvalid"))
            .max(MANUAL_PAYMENT_MAX_MONTHS, t("monthsInvalid")),
        amount: z
            .string()
            .trim()
            .refine((value) => !value || AMOUNT_PATTERN.test(value), t("amountInvalid")),
        planCode: z.string(),
    });
};

type ManualPaymentValues = z.infer<ReturnType<typeof useManualPaymentSchema>>;

const toPaymentBody = (values: ManualPaymentValues): ManualPaymentInput => ({
    months: values.months,
    ...(values.amount ? { amount: values.amount } : {}),
    ...(values.planCode ? { planCode: values.planCode } : {}),
});

function ManualPaymentForm({
    club,
    subscription,
    onDone,
}: {
    club: ClubSubscriptionRow;
    subscription: ClubSubscription;
    onDone: () => void;
}) {
    const t = useTranslations("billing.clubs.payment");
    const tCommon = useTranslations("common");
    const schema = useManualPaymentSchema();
    const { data: plans = [] } = useBillingPlans();
    const mutation = useRecordManualPayment();
    const errorMessage = useBillingErrorMessage("subscription");
    const format = useBillingFormat();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ManualPaymentValues>({
        resolver: zodResolver(schema),
        defaultValues: { months: 1, amount: "", planCode: "" },
    });
    const [months, planCode] = useWatch({ control, name: ["months", "planCode"] });

    const selectedPlan = plans.find((plan) => plan.code === planCode) ?? subscription.plan;
    const defaultAmount = Number.isInteger(months)
        ? format.money(manualPaymentAmount(selectedPlan, months), selectedPlan.currency)
        : "—";
    const otherPlans = plans.filter(
        (plan) => plan.isActive && plan.code !== subscription.plan.code
    );

    const onSubmit = handleSubmit((values) =>
        mutation.mutate(
            { portalId: club.portalId, body: toPaymentBody(values) },
            {
                onSuccess: (saved) => {
                    toast.success(
                        t("success", {
                            club: club.portalDisplayName,
                            date: format.date(saved.currentPeriodEnd) ?? "—",
                        })
                    );
                    onDone();
                },
            }
        )
    );

    return (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FieldInput
                label={t("months")}
                type="number"
                min={1}
                max={MANUAL_PAYMENT_MAX_MONTHS}
                step={1}
                error={errors.months?.message}
                required
                {...register("months", { valueAsNumber: true })}
            />
            <SelectField
                label={t("plan")}
                error={errors.planCode?.message}
                {...register("planCode")}
            >
                <option value="">
                    {t("planCurrent", {
                        plan: `${subscription.plan.name}, ${format.price(subscription.plan)}`,
                    })}
                </option>
                {otherPlans.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                        {`${plan.name} (${plan.code}) — ${format.price(plan)}`}
                    </option>
                ))}
            </SelectField>
            <FieldInput
                label={t("amount")}
                helperText={t("amountHint", { amount: defaultAmount })}
                error={errors.amount?.message}
                inputMode="decimal"
                placeholder={manualPaymentAmount(
                    selectedPlan,
                    Number.isInteger(months) ? months : 1
                )}
                {...register("amount")}
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
                    {mutation.isPending ? t("submitting") : t("submit")}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function ManualPaymentDialog({
    club,
    disabled,
}: {
    club: ClubSubscriptionRow;
    disabled: boolean;
}) {
    const t = useTranslations("billing.clubs");
    const [open, setOpen] = useState(false);
    const subscription = club.subscription;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled || !subscription}>
                    <Banknote />
                    {t("markPayment")}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {t("payment.title", { club: club.portalDisplayName })}
                    </DialogTitle>
                    <DialogDescription>{t("payment.description")}</DialogDescription>
                </DialogHeader>
                {subscription ? (
                    <ManualPaymentForm
                        club={club}
                        subscription={subscription}
                        onDone={() => setOpen(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
