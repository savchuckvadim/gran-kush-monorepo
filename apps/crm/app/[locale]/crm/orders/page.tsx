"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { ShoppingCart } from "lucide-react";

import { OrdersTable } from "@/modules/widgets/orders";

export default function CrmOrdersPage() {
    const t = useTranslations("crm.orders");
    const params = useParams();
    const locale = (params.locale as string) ?? "en";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <ShoppingCart className="h-6 w-6" />
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            <OrdersTable locale={locale} />
        </div>
    );
}
