import { getTranslations } from "next-intl/server";

import {
    CategoryManagementWidget,
    MeasurementUnitManagementWidget,
} from "@/modules/widgets/settings";

export default async function CrmSettingsPage() {
    const t = await getTranslations("crm.sections.settings");
    return (
        <div className="space-y-6">
            <div className="rounded-lg border bg-background p-6">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <CategoryManagementWidget />
            <MeasurementUnitManagementWidget />
        </div>
    );
}
