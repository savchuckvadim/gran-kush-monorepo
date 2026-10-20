import { getTranslations } from "next-intl/server";

import { CreateOrderForm } from "@/modules/features";

export default async function CrmOrderNewPage({
    searchParams,
}: {
    searchParams: Promise<{ memberId?: string | string[]; productId?: string | string[] }>;
}) {
    const t = await getTranslations("crm.orders.create");
    const { memberId, productId } = await searchParams;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-background p-4 sm:p-6">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">
                    {t("description")}
                </p>
                <CreateOrderForm
                    initialMemberId={typeof memberId === "string" ? memberId : undefined}
                    initialProductId={typeof productId === "string" ? productId : undefined}
                />
            </div>
        </div>
    );
}
