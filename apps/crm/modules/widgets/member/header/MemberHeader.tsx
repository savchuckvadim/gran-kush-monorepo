"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import { CrmMemberDetails, useResendMemberConsent } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberStatuses } from "./components/MemberStatuses";
import { MemberStatusSelect } from "./components/MemberStatusSelect";

export interface IMemberHeaderProps {
    member: CrmMemberDetails;
}
export function MemberHeader({ member }: IMemberHeaderProps) {
    const t = useTranslations("crm.members");
    const toAppPath = useLocalizedLink();
    const membersPath = toAppPath(ROUTES.CRM_MEMBERS);
    const resend = useResendMemberConsent(member.id);
    const isPending = member.consentStatus === "pending";
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    {member.name} {member.surname ?? ""}
                </h1>
                <MemberStatuses member={member} />
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                        {member.email} · {t("statusLabel")}:
                    </span>
                    <MemberStatusSelect member={member} />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
                {isPending && (
                    <Button
                        variant="outline"
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
                <Button variant="outline" asChild>
                    <Link href={membersPath}>{t("backToClients")}</Link>
                </Button>
            </div>
        </div>
    );
}
