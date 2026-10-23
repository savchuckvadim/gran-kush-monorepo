"use client";

import { useTranslations } from "next-intl";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import { type CrmMemberDetails, useResendMemberConsent } from "@/modules/entities/member";
import { MemberProfileEditModal, NewOrderButton } from "@/modules/features";
import { brandHas } from "@/modules/shared/config/brand";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

import { MemberPresenceButton } from "./MemberPresenceButton";
import { MemberQrDialog } from "./MemberQrDialog";

interface MemberHeroActionsProps {
    member: CrmMemberDetails;
    inClubNow: boolean;
}

export function MemberHeroActions({ member, inClubNow }: MemberHeroActionsProps) {
    const t = useTranslations("crm.members");
    const resend = useResendMemberConsent(member.id);
    // QR и отметка визита — только там, где у инсталляции есть дверь
    const hasDoor = brandHas("presence");

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {member.consentStatus === "pending" && (
                <Button
                    variant="outline"
                    size="sm"
                    disabled={resend.isPending}
                    onClick={() =>
                        resend.mutate(undefined, {
                            onSuccess: () => toast.success(t("consent.resent")),
                            onError: (error) => notifyApiError(error, t("consent.resendError")),
                        })
                    }
                >
                    <Send className="size-4" aria-hidden="true" />
                    {resend.isPending ? t("consent.resending") : t("consent.resend")}
                </Button>
            )}
            {member.isActive && hasDoor && (
                <MemberPresenceButton memberId={member.id} inClubNow={inClubNow} />
            )}
            {member.isActive && <NewOrderButton memberId={member.id} size="sm" variant="outline" />}
            {hasDoor && <MemberQrDialog memberId={member.id} />}
            <MemberProfileEditModal member={member} />
        </div>
    );
}
