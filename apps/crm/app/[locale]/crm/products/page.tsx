"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Package } from "lucide-react";

import { ProductsTable } from "@/modules/widgets/products";
import { ProductFormDialog } from "@/modules/widgets/products";

export default function CrmProductsPage() {
    const t = useTranslations("crm.products");
    const params = useParams();
    const locale = (params.locale as string) ?? "en";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Package className="h-6 w-6" />
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                <ProductFormDialog />
            </div>

            <ProductsTable locale={locale} />
        </div>
    );
}
