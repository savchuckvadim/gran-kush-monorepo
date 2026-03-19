import { Suspense } from "react";

import { Loader2 } from "lucide-react";

import { ScanRedirectClient } from "@/app/scan/scan-redirect-client";

function ScanLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Перенаправление...</p>
            </div>
        </div>
    );
}

export default function LocalizedScanRedirectPage() {
    return (
        <Suspense fallback={<ScanLoading />}>
            <ScanRedirectClient />
        </Suspense>
    );
}
