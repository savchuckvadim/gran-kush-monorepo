import { getTranslations } from "next-intl/server";

import { CreateMemberForm } from "@/modules/features";

export default async function CrmMemberNewPage() {
    const t = await getTranslations("crm.members.create");

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-background p-6">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">
                    {t("description")}
                </p>
                <CreateMemberForm />
            </div>
        </div>
    );
}
