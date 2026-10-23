import { notFound } from "next/navigation";

import type { BrandModuleCode } from "@workspace/brand";

import { brandHas } from "@/modules/shared/config/brand";

/**
 * Раздел корневой функции инсталляции (дверь, правила клуба, подписка): где бренд её не
 * предлагает, раздела нет — 404, как у API. Серверный компонент для `layout.tsx` раздела.
 */
export function BrandModuleGate({
    module,
    children,
}: {
    module: BrandModuleCode;
    children: React.ReactNode;
}) {
    if (!brandHas(module)) {
        notFound();
    }
    return children;
}
