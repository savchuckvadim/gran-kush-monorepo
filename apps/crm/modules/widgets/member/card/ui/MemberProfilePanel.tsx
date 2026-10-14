"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui/components/card";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { useDateFormat } from "@/modules/shared/lib/use-date-format";

import { MemberFact } from "./MemberFact";
import { MemberFactGroup } from "./MemberFactGroup";

/** Fields the hero or the groups below already show. */
const SHOWN_FIELD_KEYS = new Set([
    "first_name",
    "last_name",
    "phone",
    "birthday",
    "address",
    "notes",
]);

const fieldText = (value: unknown): string | null => {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") {
        return null;
    }
    if (Array.isArray(value)) return value.map(String).join(", ");
    return typeof value === "object" ? JSON.stringify(value) : String(value);
};

export function MemberProfilePanel({ member }: { member: CrmMemberDetails }) {
    const t = useTranslations("crm.members.card.profile");
    const date = useDateFormat();

    // boolean fields are the marks in the hero
    const extra = member.fields.filter(
        (field) => !SHOWN_FIELD_KEYS.has(field.fieldKey) && fieldText(field.value) !== null
    );

    return (
        <Card className="gap-5 px-4 md:px-5">
            <h2 className="text-base font-semibold">{t("title")}</h2>

            <MemberFactGroup title={t("contacts")}>
                <MemberFact label={t("email")} value={member.email} />
                <MemberFact label={t("phone")} value={member.phone} />
                <MemberFact label={t("address")} value={member.address} />
            </MemberFactGroup>

            <MemberFactGroup title={t("personal")}>
                <MemberFact
                    label={t("birthday")}
                    value={member.birthday ? date(member.birthday) : null}
                />
            </MemberFactGroup>

            <MemberFactGroup title={t("club")}>
                <MemberFact label={t("number")} value={member.membershipNumber} mono />
                <MemberFact label={t("joined")} value={date(member.createdAt)} />
                <MemberFact
                    label={t("consent")}
                    value={
                        member.consentStatus === "pending"
                            ? t("consentPending")
                            : t("consentConfirmed")
                    }
                />
            </MemberFactGroup>

            {extra.length > 0 && (
                <MemberFactGroup title={t("extra")}>
                    {extra.map((field) => (
                        <MemberFact
                            key={field.fieldKey}
                            label={field.label ?? field.fieldKey}
                            value={fieldText(field.value)}
                        />
                    ))}
                </MemberFactGroup>
            )}

            {member.notes && (
                <MemberFactGroup title={t("notes")}>
                    <p className="text-sm whitespace-pre-line">{member.notes}</p>
                </MemberFactGroup>
            )}
        </Card>
    );
}
