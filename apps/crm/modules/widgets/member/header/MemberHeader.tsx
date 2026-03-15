'use client'
import { CrmMemberDetails } from "@/modules/entities/member";
import { Button } from "@workspace/ui";
import { Link } from "lucide-react";
import { MemberStatuses } from "./components/MemberStatuses";
import { useTranslations } from "next-intl";

export interface IMemberHeaderProps {
    member: CrmMemberDetails;
    locale: string;
}
export function MemberHeader({ member, locale }: IMemberHeaderProps) {
    const t = useTranslations("crm.members");
    return (
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-semibold">
                    {member.name} {member.surname ?? ""}
                </h1>
                <MemberStatuses member={member} locale={locale} />
                <p className="text-sm text-muted-foreground">
                    {member.email} · {t("statusLabel")}: {member.status}
                </p>
            </div>
            <Button variant="outline" asChild>
                <Link href={`/${locale}/crm/members`}>{t("backToClients")}</Link>
            </Button>
        </div>
    );

}