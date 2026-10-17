"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui/components/card";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { fieldValueText } from "@/modules/shared/lib/field-value-text";
import { useDateFormat } from "@/modules/shared/lib/use-date-format";
import { Fact, FactGroup } from "@/modules/shared/ui/Fact";

/** Fields the hero or the groups below already show. */
const SHOWN_FIELD_KEYS = new Set([
    "first_name",
    "last_name",
    "phone",
    "birthday",
    "address",
    "notes",
]);

export function MemberProfilePanel({ member }: { member: CrmMemberDetails }) {
    const t = useTranslations("crm.members.card.profile");
    const date = useDateFormat();

    // boolean fields are the marks in the hero
    const extra = member.fields.filter(
        (field) => !SHOWN_FIELD_KEYS.has(field.fieldKey) && fieldValueText(field.value) !== null
    );

    return (
        <Card className="gap-5 px-4 md:px-5">
            <h2 className="text-base font-semibold">{t("title")}</h2>

            <FactGroup title={t("contacts")}>
                <Fact label={t("email")} value={member.email} />
                <Fact label={t("phone")} value={member.phone} />
                <Fact label={t("address")} value={member.address} />
            </FactGroup>

            <FactGroup title={t("personal")}>
                <Fact
                    label={t("birthday")}
                    value={member.birthday ? date(member.birthday) : null}
                />
            </FactGroup>

            <FactGroup title={t("club")}>
                <Fact label={t("number")} value={member.membershipNumber} mono />
                <Fact label={t("joined")} value={date(member.createdAt)} />
                <Fact
                    label={t("consent")}
                    value={
                        member.consentStatus === "pending"
                            ? t("consentPending")
                            : t("consentConfirmed")
                    }
                />
            </FactGroup>

            {extra.length > 0 && (
                <FactGroup title={t("extra")}>
                    {extra.map((field) => (
                        <Fact
                            key={field.fieldKey}
                            label={field.label ?? field.fieldKey}
                            value={fieldValueText(field.value)}
                        />
                    ))}
                </FactGroup>
            )}

            {member.notes && (
                <FactGroup title={t("notes")}>
                    <p className="text-sm whitespace-pre-line">{member.notes}</p>
                </FactGroup>
            )}
        </Card>
    );
}
