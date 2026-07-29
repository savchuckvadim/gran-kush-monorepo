import { useQuery } from "@tanstack/react-query";

import { usePortal } from "@/modules/processes";

import { getPortalInfo } from "../api";

export const portalInfoKeys = {
    all: ["crm-portal-info"] as const,
    detail: (portalSlug: string | null) => [...portalInfoKeys.all, portalSlug] as const,
} as const;

export function usePortalInfo() {
    const { portalSlug, hasPortal } = usePortal();
    return useQuery({
        queryKey: portalInfoKeys.detail(portalSlug),
        queryFn: getPortalInfo,
        enabled: hasPortal,
        staleTime: 60_000,
    });
}
