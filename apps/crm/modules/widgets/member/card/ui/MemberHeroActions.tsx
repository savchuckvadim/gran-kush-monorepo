"use client";

import { useTranslations } from "next-intl";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import { type CrmMemberDetails, useResendMemberConsent } from "@/modules/entities/member";
import { MemberProfileEditModal } from "@/modules/features";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

import { MemberQrDialog } from "./MemberQrDialog";

export function MemberHeroActions({ member }: { member: CrmMemberDetails }) {
    const t = useTranslations("crm.members");
    const resend = useResendMemberConsent(member.id);

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
            <MemberQrDialog memberId={member.id} />
            <MemberProfileEditModal member={member} />
        </div>
    );
}
