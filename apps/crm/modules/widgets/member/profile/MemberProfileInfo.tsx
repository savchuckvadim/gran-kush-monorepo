'use client'
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { CrmMemberDetails } from "@/modules/entities/member";
import { MemberProfileEditModal } from "@/modules/features";
export interface IMemberProfileInfoProps {
    member: CrmMemberDetails;

}
export function MemberProfileInfo({ member }: IMemberProfileInfoProps) {
    const t = useTranslations("crm.members");
    return (
        <Card className="p-4 ">
            <section className="">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-base font-medium">{t("profileTitle")}</h2>
                    <MemberProfileEditModal member={member} />
                </div>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("memberId")}</dt>
                        <dd className="text-right font-mono text-xs">{member.id}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("userId")}</dt>
                        <dd className="text-right font-mono text-xs">{member.userId}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("phone")}</dt>
                        <dd>{member.phone ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("birthday")}</dt>
                        <dd>{member.birthday ? new Date(member.birthday).toLocaleDateString() : "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("address")}</dt>
                        <dd className="text-right">{member.address ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("membershipNumber")}</dt>
                        <dd>{member.membershipNumber ?? "—"}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("createdAt")}</dt>
                        <dd>{new Date(member.createdAt).toLocaleString()}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t("updatedAt")}</dt>
                        <dd>{new Date(member.updatedAt).toLocaleString()}</dd>
                    </div>
                </dl>
            </section>
        </Card>

    )
}