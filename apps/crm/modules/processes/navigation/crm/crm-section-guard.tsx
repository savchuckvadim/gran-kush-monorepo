"use client";

import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

import { RequirePermission } from "@/modules/entities/access";
import { useLocalizedLink } from "@/modules/shared";

import { CRM_SECTION_PERMISSIONS } from "./crm-section-permissions";

/** Раздел CRM без нужных прав показывает «Нет доступа» — по таблице `CRM_SECTION_PERMISSIONS`. */
export function CrmSectionGuard({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const localizedLink = useLocalizedLink();
    const section = CRM_SECTION_PERMISSIONS.find(({ prefix }) => {
        const root = localizedLink(prefix);
        return pathname === root || pathname.startsWith(`${root}/`);
    });

    if (!section?.anyOf) return children;
    return <RequirePermission anyOf={section.anyOf}>{children}</RequirePermission>;
}
