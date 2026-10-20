import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePortal } from "@/modules/processes";

import { getPortalInfo, updatePortalAppearance } from "../api";
import { portalInfoKeys } from "../model/portal-info-keys";

export { portalInfoKeys };

export function usePortalInfo() {
    const { portalSlug, hasPortal } = usePortal();
    return useQuery({
        queryKey: portalInfoKeys.detail(portalSlug),
        queryFn: getPortalInfo,
        enabled: hasPortal,
        staleTime: 60_000,
    });
}

/** Тема клуба меняет `defaultSkin` в инфо клуба: перечитываем его, оболочка подхватит тему. */
export function useUpdatePortalAppearance() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePortalAppearance,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: portalInfoKeys.all }),
    });
}
