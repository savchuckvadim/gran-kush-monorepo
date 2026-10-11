import { Suspense } from "react";

import { SettingsHubPage } from "@/modules/pages";

export default function CrmSettingsPage() {
    return (
        <Suspense>
            <SettingsHubPage />
        </Suspense>
    );
}
