import { getTranslations } from "next-intl/server";

import { RegisterMemberForm } from "@/modules/features";


export default async function CrmMemberNewPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations("crm.members");

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-background p-6">
                <h2 className="text-lg font-semibold">Register member</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                    Create a member account for this portal.
                </p>
                <RegisterMemberForm />
            </div>

        </div>
    );
}
