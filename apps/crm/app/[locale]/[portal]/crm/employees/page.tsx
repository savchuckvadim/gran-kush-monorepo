import { getTranslations } from "next-intl/server";

import { RegisterEmployeeForm } from "@/modules/features";

export default async function CrmEmployeesPage() {
    const t = await getTranslations("crm.sections.employees");
    return (
        <div className="space-y-4">
            <div className="rounded-lg border bg-background p-6">
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <div className="rounded-lg border bg-background p-6">
                <h2 className="text-lg font-semibold">Register employee</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">
                    Create a new employee inside the current portal.
                </p>
                <RegisterEmployeeForm />
            </div>
        </div>
    );
}
