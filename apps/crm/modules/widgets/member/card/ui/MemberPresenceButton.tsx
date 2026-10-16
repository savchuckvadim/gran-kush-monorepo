"use client";

import { useTranslations } from "next-intl";

import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import { useManualCheckIn, useManualCheckOut } from "@/modules/entities/presence";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

interface MemberPresenceButtonProps {
    memberId: string;
    inClubNow: boolean;
}

/**
 * Ручная отметка, когда QR не сработал или участник без телефона: в клубе — выход, нет — вход.
 * Отметка пишется на сотрудника, как и скан на стойке.
 */
export function MemberPresenceButton({ memberId, inClubNow }: MemberPresenceButtonProps) {
    const t = useTranslations("crm.members.card.presence");
    const checkIn = useManualCheckIn();
    const checkOut = useManualCheckOut();
    const mutation = inClubNow ? checkOut : checkIn;
    const Icon = inClubNow ? LogOut : LogIn;

    return (
        <Button
            variant="outline"
            size="sm"
            disabled={checkIn.isPending || checkOut.isPending}
            onClick={() =>
                mutation.mutate(memberId, {
                    onSuccess: () => toast.success(t(inClubNow ? "checkedOut" : "checkedIn")),
                    onError: (error) => notifyApiError(error, t("error")),
                })
            }
        >
            <Icon className="size-4" aria-hidden="true" />
            {t(inClubNow ? "checkOut" : "checkIn")}
        </Button>
    );
}
