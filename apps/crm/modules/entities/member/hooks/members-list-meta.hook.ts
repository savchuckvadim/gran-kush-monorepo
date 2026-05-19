"use client";
import { SchemaMemberFormFieldSchemaItemDto, SchemaMemberLifecycleStatusItemDto } from "@workspace/api-client/core";

import { useMemberFilterFields } from "./member-filter-fields.hook";
import { useMemberStatusItems } from "./member-status-items.hook";

export const membersListMetaKeys = {
    all: ["crm-members-list-meta"] as const,
    lists: () => [...membersListMetaKeys.all, "list"] as const,
    list: () => [...membersListMetaKeys.lists()] as const,
} as const;

export type MembersListMeta = {
    statuses: SchemaMemberLifecycleStatusItemDto[];
    filterFields: SchemaMemberFormFieldSchemaItemDto[];
}
export function useMembersListMeta(isEnabled: boolean) {
    const statusesQuery = useMemberStatusItems(isEnabled);
    const filterFieldsQuery = useMemberFilterFields(isEnabled);

    return {
        statuses: statusesQuery.data,
        filterFields: filterFieldsQuery.data,
        isMetaLoading: statusesQuery.isPending || filterFieldsQuery.isPending,
        isMetaError: statusesQuery.isError || filterFieldsQuery.isError,
    };
}