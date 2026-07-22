"use client";
import { useEffect } from "react";

import { useQuery, UseQueryResult } from "@tanstack/react-query";

import { SchemaMemberFormFieldSchemaItemDto } from "@workspace/api-client/core";

import { getEntityFilterFields } from "@/modules/entities/entity-settings";
import { notifyApiError } from "@/modules/shared";

export const memberFilterFieldsKeys = {
    all: ["crm-member-filter-fields"] as const,
    list: () => [...memberFilterFieldsKeys.all, "list"] as const,
} as const;

export function useMemberFilterFields(
    isEnabled: boolean
): UseQueryResult<SchemaMemberFormFieldSchemaItemDto[], Error> {
    const query = useQuery({
        queryKey: memberFilterFieldsKeys.list(),
        queryFn: () => getEntityFilterFields("member"),
        enabled: isEnabled,
    });
    useEffect(() => {
        if (query.isError) {
            notifyApiError(query.error);
        }
    }, [query.isError, query.error]);
    return query;
}
