import type { ReactNode } from "react";

import { PortalProvider } from "@/modules/processes";

/**
 * Внутренний PortalProvider перекрывает значение из `[locale]/layout` (там всегда null):
 * иначе usePortal / useLocalizedLink не видят slug из URL и ссылки уходят на `/locale/crm/...` без портала.
 */
export default async function PortalSegmentLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ locale: string; portal: string }>;
}) {
    const { portal } = await params;

    return <PortalProvider portalSlug={portal}>{children}</PortalProvider>;
}
