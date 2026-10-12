"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCrmMemberById, getCrmMembers } from "../api/member.api";
import { CrmMemberListParams } from "../type/member.type";

// Query keys
export const memberKeys = {
    all: ["crm-members"] as const,
    lists: () => [...memberKeys.all, "list"] as const,
    list: (params: CrmMemberListParams) => [...memberKeys.lists(), params] as const,
    details: () => [...memberKeys.all, "detail"] as const,
    detail: (id: string) => [...memberKeys.details(), id] as const,
};

/** A page of members; the previous page stays on screen while the next one loads. */
export function useCrmMembers(params: CrmMemberListParams, { enabled = true } = {}) {
    return useQuery({
        queryKey: memberKeys.list(params),
        queryFn: () => getCrmMembers(params),
        placeholderData: keepPreviousData,
        enabled,
    });
}

// Hook for fetching single member details
export function useMemberDetails(memberId: string) {
    return useQuery({
        queryKey: memberKeys.detail(memberId),
        queryFn: () => getCrmMemberById(memberId),
        enabled: !!memberId,
    });
}
