"use client";
import { useEffect } from "react";

import { useQuery, UseQueryResult } from "@tanstack/react-query";

import { SchemaMemberFormFieldSchemaItemDto } from "@workspace/api-client/core";

import { $api, notifyApiError } from "@/modules/shared";

export const memberFilterFieldsKeys = {
    all: ["crm-member-filter-fields"] as const,
    list: () => [...memberFilterFieldsKeys.all, "list"] as const,
} as const;

export function useMemberFilterFields(
    isEnabled: boolean
): UseQueryResult<SchemaMemberFormFieldSchemaItemDto[], Error> {
    const query = useQuery({
        queryKey: memberFilterFieldsKeys.list(),
        queryFn: () =>
            $api.GET("/crm/settings/entities/{code}/filter-fields", {
                params: { path: { code: "member" } },
            }),
        enabled: isEnabled,
        select: (response) => response.data as SchemaMemberFormFieldSchemaItemDto[],
    });
    useEffect(() => {
        if (query.isError) {
            notifyApiError(query.error);
        }
    }, [query.isError, query.error]);
    return query;
}
