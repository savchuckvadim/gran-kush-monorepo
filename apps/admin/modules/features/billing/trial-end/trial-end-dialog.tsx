"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock } from "lucide-react";
import { useForm } from "react-hook-form";
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
    type ClubSubscription,
    type ClubSubscriptionRow,
    dateInputToIso,
    isoToDateInput,
    useBillingFormat,
    useSetClubTrialEnd,
} from "@/modules/entities/billing";

import { useBillingErrorMessage } from "../lib/use-billing-error-message";

const useTrialEndSchema = () => {
    const t = useTranslations("billing.clubs.trial");
    return z.object({
        trialEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("dateRequired")),
    });
};

type TrialEndValues = z.infer<ReturnType<typeof useTrialEndSchema>>;

function TrialEndForm({
    club,
    subscription,
    onDone,
}: {
    club: ClubSubscriptionRow;
    subscription: ClubSubscription;
    onDone: () => void;
}) {
    const t = useTranslations("billing.clubs.trial");
    const tCommon = useTranslations("common");
    const schema = useTrialEndSchema();
    const mutation = useSetClubTrialEnd();
    const errorMessage = useBillingErrorMessage("subscription");
    const format = useBillingFormat();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<TrialEndValues>({
        resolver: zodResolver(schema),
        defaultValues: { trialEndsAt: isoToDateInput(subscription.trialEndsAt) },
    });

    const onSubmit = handleSubmit((values) =>
        mutation.mutate(
            { portalId: club.portalId, trialEndsAt: dateInputToIso(values.trialEndsAt) },
            {
                onSuccess: (saved) => {
                    toast.success(
                        t("success", {
                            club: club.portalDisplayName,
                            date: format.date(saved.trialEndsAt) ?? "—",
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
                label={t("date")}
                type="date"
                error={errors.trialEndsAt?.message}
                required
                {...register("trialEndsAt")}
            />
            {subscription.status === "active" ? (
                <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                    {t("activeWarning")}
                </p>
            ) : null}
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

export function TrialEndDialog({
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
                    <CalendarClock />
                    {t("trialEnd")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("trial.title", { club: club.portalDisplayName })}</DialogTitle>
                    <DialogDescription>{t("trial.description")}</DialogDescription>
                </DialogHeader>
                {subscription ? (
                    <TrialEndForm
                        club={club}
                        subscription={subscription}
                        onDone={() => setOpen(false)}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
