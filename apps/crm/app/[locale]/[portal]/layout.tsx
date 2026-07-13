import { notFound } from "next/navigation";
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

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const res = await fetch(`${apiUrl}/crm/portals/resolve?slug=${portal}`, {
        next: { revalidate: 60 },
    });
    if (!res.ok) {
        notFound();
    }

    return <PortalProvider portalSlug={portal}>{children}</PortalProvider>;
}
