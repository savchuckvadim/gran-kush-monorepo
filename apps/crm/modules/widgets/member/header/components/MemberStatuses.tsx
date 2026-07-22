"use client";
import { useTranslations } from "next-intl";

import { CrmMemberDetails } from "@/modules/entities/member";

export interface IMemberStatusesProps {
    member: CrmMemberDetails;
}
export function MemberStatuses({ member }: IMemberStatusesProps) {
    const t = useTranslations("crm.members");
    const booleanBadges = member.fields.filter((field) => (field.value as unknown) === true);
    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {booleanBadges.map((field) => (
                <span
                    key={field.fieldKey}
                    className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                    {field.label ?? field.fieldKey}
                </span>
            ))}
            <span
                className={`rounded-md px-2 py-1 text-xs ${
                    member.isActive
                        ? "border border-green-500/30 bg-green-500/10 text-green-700"
                        : "border border-amber-500/30 bg-amber-500/10 text-amber-700"
                }`}
            >
                {member.isActive ? t("emailConfirmed") : t("emailNotConfirmed")}
            </span>
        </div>
    );
}
