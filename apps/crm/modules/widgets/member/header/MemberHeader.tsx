"use client";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { MemberStatuses } from "./components/MemberStatuses";

export interface IMemberHeaderProps {
    member: CrmMemberDetails;
}
export function MemberHeader({ member }: IMemberHeaderProps) {
    const t = useTranslations("crm.members");
    const toAppPath = useLocalizedLink();
    const membersPath = toAppPath(ROUTES.CRM_MEMBERS);
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    {member.name} {member.surname ?? ""}
                </h1>
                <MemberStatuses member={member} />
                <p className="text-sm text-muted-foreground">
                    {member.email} · {t("statusLabel")}: {member.status}
                </p>
            </div>
            <Button variant="outline" asChild>
                <Link href={membersPath}>{t("backToClients")}</Link>
            </Button>
        </div>
    );
}
