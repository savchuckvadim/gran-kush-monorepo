"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";

import type { CrmMemberDetails } from "@/modules/entities/member";

import { MemberStatusSelect } from "./MemberStatusSelect";

/** Dynamic field values come typed as objects by the API schema; a mark is a plain `true`. */
const isMark = (value: unknown): boolean => value === true;

interface MemberHeroBadgesProps {
    member: CrmMemberDetails;
    inClubNow: boolean;
}

/** Status (it can be changed right here), consent, email and the boolean profile marks. */
export function MemberHeroBadges({ member, inClubNow }: MemberHeroBadgesProps) {
    const t = useTranslations("crm.members");
    const marks = member.fields.filter((field) => isMark(field.value));

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <MemberStatusSelect member={member} />
            {inClubNow && <Badge variant="success">{t("card.inClubNow")}</Badge>}
            {member.consentStatus === "pending" && (
                <Badge variant="warning">{t("consent.pending")}</Badge>
            )}
            <Badge variant={member.emailConfirmed ? "secondary" : "warning"}>
                {member.emailConfirmed ? t("emailConfirmed") : t("emailNotConfirmed")}
            </Badge>
            {marks.map((field) => (
                <Badge key={field.fieldKey} variant="outline">
                    {field.label ?? field.fieldKey}
                </Badge>
            ))}
        </div>
    );
}
