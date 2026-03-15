import { getTranslations } from "next-intl/server";

export default async function CrmProductsPage() {
    const t = await getTranslations("crm.sections.products");
    return (
        <div className="rounded-lg border bg-background p-6">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
        </div>
    );
}
