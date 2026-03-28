import { getTranslations } from "next-intl/server";

import { MemberList } from "@/modules/widgets/member";


export default async function CrmMembersPage() {
    const t = await getTranslations("crm.members");

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                
        
            </div>

            <MemberList />
        </div>
    );
}
