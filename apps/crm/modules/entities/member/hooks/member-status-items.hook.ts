import { useEffect } from "react";

import { useQuery, UseQueryResult } from "@tanstack/react-query";

import { SchemaMemberLifecycleStatusItemDto } from "@workspace/api-client/core";

import { $api, notifyApiError } from "@/modules/shared";
import { usePortal } from "@/modules/processes";

export const memberStatusItemsKeys = {
    all: ["crm-member-status-items"] as const,
    list: () => [...memberStatusItemsKeys.all, "list"] as const,
} as const;

export function useMemberStatusItems(
    isEnabled: boolean
): UseQueryResult<SchemaMemberLifecycleStatusItemDto[], Error> {

    const { portalSlug } = usePortal();
    console.log('portalSlug useMemberStatusItems', portalSlug)
    const query = useQuery({
        queryKey: memberStatusItemsKeys.list(),
        queryFn: () => $api.GET("/crm/settings/entities/member/status-items", {
            headers: {
                "x-portal-slug ": portalSlug,
            },
        }),
        enabled: isEnabled,
        select: (response) => response.data as SchemaMemberLifecycleStatusItemDto[],


    });
    useEffect(() => {
        if (query.isError) {
            notifyApiError(query.error);
        }
    }, [query.isError, query.error]);
    console.log('query useMemberStatusItems', query.data)
    debugger;
    return query;
}
