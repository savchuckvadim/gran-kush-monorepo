import { getTranslations } from "next-intl/server";

import { MemberList } from "@/modules/widgets/member";
import { MemberListCounter } from "@/modules/widgets/member";

export default async function CrmMembersPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations("crm.members");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                {<MemberListCounter />}
            </div>

            <MemberList locale={locale} />
        </div>
    );
}
